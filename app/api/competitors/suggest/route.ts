import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';

interface SuggestionResponse {
  id: string;
  name: string;
  website_url: string;
  reason: string;
}

async function verifyBusinessOwnership(
  supabase: NonNullable<typeof supabaseAdmin>,
  businessId: string,
  userId: string
): Promise<boolean> {
  if (!supabase) return false;

  const { data } = await supabase
    .from('businesses')
    .select('user_id')
    .eq('id', businessId)
    .is('deleted_at', null)
    .single();

  return data?.user_id === userId;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { business_id } = body as { business_id?: string };

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    const isOwner = await verifyBusinessOwnership(
      supabase,
      business_id,
      session.user.id
    );

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('business_name, business_type, address_city, address_state')
      .eq('id', business_id)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const location = [business.address_city, business.address_state].filter(Boolean).join(', ');

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ suggestions: [] satisfies SuggestionResponse[] });
    }

    const prompt = `List the top 5 ${business.business_type} businesses${location ? ` in ${location}` : ''}. Return as a JSON array of objects with "name", "website_url", and "reason" fields only. No markdown, no extra text.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', openaiResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to generate suggestions' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const responseText = openaiData.choices[0]?.message.content || '[]';

    let suggestions: SuggestionResponse[] = [];

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Array<Omit<SuggestionResponse, 'id'>>;
      suggestions = Array.isArray(parsed)
        ? parsed.map((item, index) => ({
            id: `${business_id}-${index + 1}`,
            name: item.name,
            website_url: item.website_url || '',
            reason: item.reason,
          }))
        : [];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/competitors/suggest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
