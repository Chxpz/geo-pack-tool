import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateQueries, type QueryGenerationInput } from '@/lib/query-generator';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
    }

    const body = await request.json();
    const business_id = body.business_id ?? body.businessId;
    const count = body.count ?? 10;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 }
      );
    }

    // Verify user owns the business
    const { data: business, error: businessErr } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id, business_name, business_type, business_category, description, address_city, address_state, service_areas')
      .eq('id', business_id)
      .single();

    if (businessErr || !business || business.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      );
    }

    // Generate queries using the library function
    const queryInput: QueryGenerationInput = {
      businessName: business.business_name,
      businessType: business.business_type || 'business',
      city: business.address_city || undefined,
      state: business.address_state || undefined,
      serviceAreas: Array.isArray(business.service_areas) ? business.service_areas : [],
      description: business.description,
      category: business.business_category,
    };

    const generatedQueryObjects = await generateQueries(queryInput, count);

    // Insert generated queries
    const queriesToInsert = generatedQueryObjects.map((qObj) => ({
      business_id,
      user_id: session.user.id,
      query_text: qObj.query_text,
      query_type: 'system_generated',
      is_active: true,
    }));

    const { data: insertedQueries, error: insertErr } = await supabaseAdmin
      .from('tracked_queries')
      .insert(queriesToInsert)
      .select();

    if (insertErr) {
      console.error('[queries/generate] Insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to generate and insert queries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      generated: insertedQueries ?? [],
      count: (insertedQueries ?? []).length,
      queryIds: (insertedQueries ?? []).map((query) => query.id),
    });
  } catch (error) {
    console.error('[queries/generate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
