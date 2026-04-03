import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const operatorId = searchParams.get('operator_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = supabase
      .from('operator_tasks')
      .select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (operatorId) {
      query = query.eq('operator_id', operatorId);
    }

    const { data: tasks, error } = await query
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json(tasks || []);
  } catch (error) {
    console.error('GET /api/admin/tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
