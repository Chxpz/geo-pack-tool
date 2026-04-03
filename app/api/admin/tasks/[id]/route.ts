import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  id: string;
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<RouteParams> }
) {
  const requestLogger = createRequestLogger(request, { route: '/api/admin/tasks/[id]' });

  try {
    const params = await props.params;
    const taskId = params.id;
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

    // Parse request body
    const body = await request.json();
    const { status, operator_id, notes } = body;

    // Validate request
    if (!status && !operator_id && !notes) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (operator_id) updates.operator_id = operator_id;
    if (notes !== undefined) updates.notes = notes;

    // Update task
    const { data: task, error } = await supabase
      .from('operator_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      requestLogger.error({ error, userId: session.user.id, taskId }, 'Failed to update task');
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    requestLogger.error({ err: error }, 'Admin task update request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<RouteParams> }
) {
  const requestLogger = createRequestLogger(request, { route: '/api/admin/tasks/[id]' });

  try {
    const params = await props.params;
    const taskId = params.id;
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

    // Fetch task
    const { data: task, error } = await supabase
      .from('operator_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      requestLogger.error({ error, userId: session.user.id, taskId }, 'Failed to fetch task');
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    requestLogger.error({ err: error }, 'Admin task fetch request failed');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
