/**
 * POST /api/agent/chat
 * AI Concierge chat endpoint with streaming response
 * Enterprise plan only. Rate limited to 20/hour.
 * Streaming SSE: text_delta, citation, done events
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';
import { buildAgentContext, buildSystemPrompt } from '@/lib/geo-agent';
import { canAccessFeature } from '@/lib/plan-limits';

const AGENT_MODEL = process.env.AGENT_MODEL || 'gpt-4o';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ChatRequest {
  business_id: string;
  conversation_id?: string;
  message: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check Enterprise plan
  const subscription = await getUserSubscription(session.user.id);
  if (!canAccessFeature(subscription.plan, 'concierge')) {
    return NextResponse.json(
      { error: 'Concierge feature requires Enterprise plan' },
      { status: 403 }
    );
  }

  if (!supabaseAdmin || !OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'Service not configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as ChatRequest;
    const { business_id, conversation_id, message } = body;

    if (!business_id || !message) {
      return NextResponse.json(
        { error: 'business_id and message are required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', business_id)
      .eq('user_id', session.user.id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or not owned by user' },
        { status: 404 }
      );
    }

    // Build RAG context
    const context = await buildAgentContext(business_id);
    const systemPrompt = buildSystemPrompt(context);

    // Get or create conversation
    let convId = conversation_id;
    let conversationMessages: Message[] = [];

    if (convId) {
      const { data: conv } = await supabaseAdmin
        .from('agent_conversations')
        .select('messages')
        .eq('id', convId)
        .eq('business_id', business_id)
        .single();

      if (conv) {
        conversationMessages = (conv.messages as Message[]) || [];
      }
    } else {
      // Create new conversation
      const newConvId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      convId = newConvId;

      await supabaseAdmin.from('agent_conversations').insert({
        id: convId,
        business_id,
        user_id: session.user.id,
        messages: [],
        context_snapshot: context,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    conversationMessages.push(userMessage);

    // Prepare messages for API
    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationMessages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    // Set up streaming response
    const { readable, writable } = new TransformStream<string>();
    const writer = writable.getWriter();

    // Stream the response
    (async () => {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: AGENT_MODEL,
            messages: apiMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          await writer.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
          await writer.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          await writer.write(`event: error\ndata: ${JSON.stringify({ error: 'No response body' })}\n\n`);
          await writer.close();
          return;
        }

        let assistantContent = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta?.content;

                if (delta) {
                  assistantContent += delta;
                  // Send text_delta event with streaming characters
                  await writer.write(
                    `event: text_delta\ndata: ${JSON.stringify({ delta })}\n\n`
                  );
                }
              } catch {
                // Ignore parse errors on malformed JSON
              }
            }
          }
        }

        // Save assistant message to conversation
        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        };
        conversationMessages.push(assistantMessage);

        await supabaseAdmin
          .from('agent_conversations')
          .update({
            messages: conversationMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', convId);

        // Send done event
        await writer.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
        await writer.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await writer.write(
          `event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`
        );
        await writer.close();
      }
    })();

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
