/**
 * POST /api/seo/snapshot
 * Trigger SEMrush data pull for a business
 * Accepts: {business_id, endpoints?: string[]}
 * Stores result in seo_snapshots table and returns data
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { pullFullSeoSnapshot } from '@/lib/semrush';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const supabase = supabaseAdmin;
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { business_id, endpoints } = body;

    if (!business_id) {
      return NextResponse.json(
        { error: 'business_id is required' },
        { status: 400 },
      );
    }

    // Load business and verify ownership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, website_url, user_id')
      .eq('id', business_id)
      .eq('user_id', session.user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 404 },
      );
    }

    if (!business.website_url) {
      return NextResponse.json(
        { error: 'Business does not have a website URL configured' },
        { status: 400 },
      );
    }

    // Determine depth based on user's plan
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('semrush_depth')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .maybeSingle();

    const depth = subscription?.semrush_depth || 'lite';

    // Map depth values: 'lite' -> 'basic', 'standard' -> 'advanced', 'pro' -> 'full'
    const seoDepth = depth === 'lite' ? 'basic' : depth === 'standard' ? 'advanced' : 'full';

    // Pull full SEO snapshot
    const seoData = await pullFullSeoSnapshot(business.website_url, seoDepth);

    // Transform domain name for storage
    const domainName = new URL(business.website_url).hostname;

    // Prepare snapshot record
    const snapshotDate = new Date().toISOString().split('T')[0];

    const snapshotRecord = {
      business_id,
      user_id: session.user.id,
      domain_authority_rank: seoData.domainOverview?.Rk,
      organic_keywords_count: seoData.organicKeywords?.length || 0,
      organic_traffic: seoData.domainOverview?.Or,
      organic_traffic_cost: seoData.domainOverview?.Ot,
      backlinks_total: seoData.backlinksOverview?.total,
      referring_domains: seoData.backlinksOverview?.domains_num,
      authority_score: seoData.backlinksOverview?.score,
      top_keywords:
        seoData.organicKeywords?.map((kw) => ({
          phrase: kw.Ph,
          position: kw.Po,
          search_volume: kw.Nq,
          traffic_value: kw.Tr,
          keyword_difficulty: kw.Kd,
          ai_overview_present: kw.FP52 ? true : false,
        })) || [],
      traffic_sources: seoData.trafficAnalytics
        ? {
            total: seoData.trafficAnalytics.visits_total,
            direct: seoData.trafficAnalytics.visits_direct,
            organic: seoData.trafficAnalytics.visits_organic,
            paid: seoData.trafficAnalytics.visits_paid,
            social: seoData.trafficAnalytics.visits_social,
            referral: seoData.trafficAnalytics.visits_referral,
            ai_assistants: seoData.trafficAnalytics.visits_ai_assistants,
            ai_search: seoData.trafficAnalytics.visits_ai_search,
          }
        : {},
      snapshot_date: snapshotDate,
    };

    // Store in seo_snapshots table
    const { data: snapshot, error: insertError } = await supabase
      .from('seo_snapshots')
      .insert(snapshotRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Error storing SEO snapshot:', insertError);
      return NextResponse.json(
        { error: 'Failed to store snapshot' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        snapshot,
        seoData,
        note: `Snapshot created with depth: ${seoDepth}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/seo/snapshot error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
