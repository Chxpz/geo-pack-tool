import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/admin/import' });

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
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
        { status: 403 },
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
        { status: 400 },
      );
    }

    if (importType !== 'manual_upload') {
      return NextResponse.json(
        { error: `Unsupported import type: ${importType}` },
        { status: 400 },
      );
    }

    const fileContent = await file.text();

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
      return NextResponse.json({ error: 'Failed to create import record' }, { status: 500 });
    }

    try {
      // Generic manual upload: store the raw content as diff_summary
      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch {
        parsed = { rawLines: fileContent.split('\n').length };
      }

      const { data: updatedImport } = await supabase
        .from('data_imports')
        .update({
          status: 'completed',
          row_count: 1,
          diff_summary: parsed,
        })
        .eq('id', dataImport.id)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        dataImport: updatedImport,
        stats: { rowsProcessed: 1 },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase
        .from('data_imports')
        .update({ status: 'failed', error_log: errorMessage })
        .eq('id', dataImport.id);

      requestLogger.error(
        { err: error, businessId, importType, importId: dataImport.id },
        'Import processing failed',
      );
      return NextResponse.json(
        { error: `Import processing failed: ${errorMessage}` },
        { status: 500 },
      );
    }
  } catch (error) {
    requestLogger.error({ err: error }, 'Admin import request failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
