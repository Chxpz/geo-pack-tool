/**
 * GET /api/agent/conversations
 * List conversations for a business with pagination
 * Returns conversation previews (ID, title, last message, updated_at)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('business_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '10', 10);

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', session.user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or not owned by user' },
        { status: 404 }
      );
    }

    // Fetch conversations with pagination
    const offset = (page - 1) * perPage;

    const { data: conversations, count } = await supabaseAdmin
      .from('agent_conversations')
      .select('id, messages, created_at, updated_at', { count: 'exact' })
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    // Transform to preview format
    const previews = (conversations || []).map(conv => {
      const messages = conv.messages as Array<{ role: string; content: string; timestamp: string }> | null;
      const lastMessage = messages?.[messages.length - 1];
      const title = messages?.[1]?.content?.slice(0, 60) + '...' || 'New conversation';

      return {
        id: conv.id,
        title,
        lastMessage: lastMessage ? {
          role: lastMessage.role,
          content: lastMessage.content.slice(0, 100),
          timestamp: lastMessage.timestamp,
        } : null,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      };
    });

    return NextResponse.json({
      conversations: previews,
      pagination: {
        page,
        perPage,
        total: count || 0,
        pages: Math.ceil((count || 0) / perPage),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
