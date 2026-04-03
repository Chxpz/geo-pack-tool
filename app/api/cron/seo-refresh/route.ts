/**
 * GET /api/cron/seo-refresh
 * Cron endpoint: refresh SEO snapshots for all businesses
 * - Verify CRON_SECRET
 * - Iterate all businesses with website_url
 * - Get plan depth for rate limiting
 * - Call pullFullSeoSnapshot
 * - Store in seo_snapshots
 * - Skip if snapshot already exists for current week
 * - Log unit consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { pullFullSeoSnapshot } from '@/lib/semrush';

interface CronResult {
  ok: boolean;
  processed: number;
  skipped: number;
  errors: Array<{ businessId: string; error: string }>;
  unitsConsumed: number;
  duration: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = supabaseAdmin;
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 },
    );
  }

  const result: CronResult = {
    ok: true,
    processed: 0,
    skipped: 0,
    errors: [],
    unitsConsumed: 0,
    duration: 0,
  };

  try {
    // Get all active businesses with website URLs
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, user_id, website_url')
      .not('website_url', 'is', null)
      .is('deleted_at', null);

    if (businessesError) {
      throw new Error(`Failed to fetch businesses: ${businessesError.message}`);
    }

    if (!businesses || businesses.length === 0) {
      result.duration = Date.now() - startTime;
      return NextResponse.json(result);
    }

    // Process each business
    for (const business of businesses) {
      try {
        // Get business owner's subscription for depth
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('semrush_depth')
          .eq('user_id', business.user_id)
          .eq('status', 'active')
          .maybeSingle();

        const depth = subscription?.semrush_depth || 'lite';
        const seoDepth = depth === 'lite' ? 'basic' : depth === 'standard' ? 'advanced' : 'full';

        // Check if snapshot already exists for current week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoDate = weekAgo.toISOString().split('T')[0];

        const { data: existingSnapshot, error: checkError } = await supabase
          .from('seo_snapshots')
          .select('id')
          .eq('business_id', business.id)
          .gte('snapshot_date', weekAgoDate)
          .limit(1)
          .maybeSingle();

        if (checkError) {
          throw new Error(`Failed to check existing snapshot: ${checkError.message}`);
        }

        if (existingSnapshot) {
          result.skipped++;
          continue;
        }

        // Pull SEO snapshot
        const seoData = await pullFullSeoSnapshot(business.website_url, seoDepth);

        // Prepare snapshot record
        const snapshotDate = new Date().toISOString().split('T')[0];

        const snapshotRecord = {
          business_id: business.id,
          user_id: business.user_id,
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

        // Store snapshot
        const { error: insertError } = await supabase
          .from('seo_snapshots')
          .insert(snapshotRecord);

        if (insertError) {
          throw new Error(`Failed to store snapshot: ${insertError.message}`);
        }

        result.processed++;

        // Estimate units consumed based on depth
        // basic = 2 endpoints, advanced = 4 endpoints, full = 6 endpoints
        const unitMap = { basic: 2, advanced: 4, full: 6 };
        result.unitsConsumed += unitMap[seoDepth as keyof typeof unitMap] || 2;

        // Rate limiting: small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error processing business ${business.id}:`, errorMsg);
        result.errors.push({
          businessId: business.id,
          error: errorMsg,
        });
        result.ok = false;
      }
    }

    result.duration = Date.now() - startTime;

    return NextResponse.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('GET /api/cron/seo-refresh error:', errorMsg);

    return NextResponse.json(
      {
        ok: false,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        unitsConsumed: result.unitsConsumed,
        duration: Date.now() - startTime,
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
