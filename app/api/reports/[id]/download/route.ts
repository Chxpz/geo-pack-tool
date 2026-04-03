import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/reports/[id]/download
 * Download report as HTML/PDF
 * Note: Actual PDF conversion would require a library like puppeteer or html2pdf
 * For now, returning HTML that can be printed to PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 },
      );
    }

    const { id } = await params;
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select('html_content, type, business_name')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 },
      );
    }

    // Return HTML as response (browser can print to PDF)
    return new NextResponse(report.html_content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="report-${id}.html"`,
      },
    });
  } catch (error) {
    console.error('Download report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
