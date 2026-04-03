import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import {
  parseSearchPromptsCSV,
  parseCitationsFullCSV,
  parseCitationsSummaryCSV,
  transformSearchPromptsToMentions,
  transformCitationsFullToCitations,
  transformCitationsSummaryToCitations,
} from '@/lib/otterly-import';

export async function POST(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/admin/import' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check user role
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - operator role required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('business_id') as string;
    const importType = formData.get('import_type') as string;

    if (!file || !businessId || !importType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, business_id, import_type' },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    // Create data import record
    const { data: dataImport, error: importError } = await supabase
      .from('data_imports')
      .insert([
        {
          business_id: businessId,
          operator_id: session.user.id,
          import_type: importType,
          file_name: file.name,
          status: 'processing',
        },
      ])
      .select()
      .single();

    if (importError || !dataImport) {
      return NextResponse.json(
        { error: 'Failed to create import record' },
        { status: 500 }
      );
    }

    // Parse and process based on import type
    let rowCount = 0;
    let diffSummary: any = {};

    try {
      if (importType === 'otterly_prompts') {
        const result = parseSearchPromptsCSV(csvContent);
        rowCount = result.validRows;

        if (result.invalidRows > 0) {
          requestLogger.warn(
            { invalidRows: result.invalidRows, errors: result.errors, businessId },
            'Import contains invalid rows',
          );
        }

        if (result.rows.length > 0) {
          const transformed = transformSearchPromptsToMentions(
            result.rows,
            businessId,
            session.user.id,
            dataImport.id
          );

          // Store tracked queries
          if (transformed.trackedQueries.length > 0) {
            await supabase
              .from('tracked_queries')
              .insert(transformed.trackedQueries);
          }

          // Store ai_mentions
          if (transformed.aiMentions.length > 0) {
            await supabase
              .from('ai_mentions')
              .insert(transformed.aiMentions);
          }

          // Create or update brand_visibility
          const { data: existingVisibility } = await supabase
            .from('brand_visibility')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false })
            .limit(1);

          const visibilityData = {
            ...transformed.brandVisibilityData,
            coverage_rate: Object.values(transformed.brandVisibilityData.platformMetrics).reduce(
              (acc: number, p: any) => acc + (p.mentionCount / p.totalQueries || 0),
              0
            ) / PLATFORM_KEYS.length,
            mention_count: Object.values(transformed.brandVisibilityData.platformMetrics).reduce(
              (acc: number, p: any) => acc + p.mentionCount,
              0
            ),
            source: 'otterly_import',
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date().toISOString().split('T')[0],
          };

          await supabase
            .from('brand_visibility')
            .insert([visibilityData]);

          diffSummary = {
            newTrackedQueries: rowCount,
            platformMetrics: transformed.brandVisibilityData.platformMetrics,
          };
        }
      } else if (importType === 'otterly_citations') {
        const result = parseCitationsFullCSV(csvContent);
        rowCount = result.validRows;

        if (result.rows.length > 0) {
          const transformed = transformCitationsFullToCitations(
            result.rows,
            businessId,
            session.user.id
          );

          await supabase
            .from('citations')
            .insert(transformed.citations);

          diffSummary = {
            newCitations: rowCount,
          };
        }
      } else if (importType === 'otterly_citations_summary') {
        const result = parseCitationsSummaryCSV(csvContent);
        rowCount = result.validRows;

        if (result.rows.length > 0) {
          const transformed = transformCitationsSummaryToCitations(
            result.rows,
            businessId,
            session.user.id
          );

          await supabase
            .from('citations')
            .insert(transformed.citations);

          diffSummary = {
            newCitations: rowCount,
          };
        }
      } else {
        // For visibility and geo_audit, parse as JSON
        try {
          const jsonData = JSON.parse(csvContent);
          rowCount = 1;
          diffSummary = jsonData;
        } catch {
          // Fallback to CSV parsing
          const result = parseSearchPromptsCSV(csvContent);
          rowCount = result.validRows;
          diffSummary = { rows: rowCount };
        }
      }

      // Update import record
      const { data: updatedImport } = await supabase
        .from('data_imports')
        .update({
          status: 'completed',
          row_count: rowCount,
          diff_summary: diffSummary,
        })
        .eq('id', dataImport.id)
        .select()
        .single();

      return NextResponse.json(
        {
          success: true,
          dataImport: updatedImport,
          stats: {
            rowsProcessed: rowCount,
            diffSummary,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update import record with error
      await supabase
        .from('data_imports')
        .update({
          status: 'failed',
          error_log: errorMessage,
        })
        .eq('id', dataImport.id);

      requestLogger.error(
        { err: error, businessId, importType, importId: dataImport.id, userId: session.user.id },
        'Import processing failed',
      );
      return NextResponse.json(
        { error: `Import processing failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    requestLogger.error({ err: error }, 'Admin import request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const PLATFORM_KEYS = ['chatgpt', 'perplexity', 'copilot', 'google_aio', 'ai_mode', 'gemini'] as const;
