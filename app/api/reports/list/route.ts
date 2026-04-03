import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/reports/list
 * List all reports for authenticated user
 */
export async function GET() {
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

    // Get user
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select('id, type, business_name, generated_at')
      .eq('user_id', session.user.id)
      .order('generated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      reports: reports || [],
    });
  } catch (error) {
    console.error('List reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
