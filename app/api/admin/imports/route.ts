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
    const businessId = searchParams.get('business_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = supabase
      .from('data_imports')
      .select('*');

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: imports, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching imports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch imports' },
        { status: 500 }
      );
    }

    return NextResponse.json(imports || []);
  } catch (error) {
    console.error('GET /api/admin/imports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
