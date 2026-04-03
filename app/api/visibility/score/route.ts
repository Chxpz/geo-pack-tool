import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateVisibilityScore } from '@/lib/visibility-score';
import type { VisibilityScoreResult } from '@/lib/types';

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/visibility/score' });

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id query param required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyTo60DaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch tracked queries
    const { data: trackedQueries } = await supabaseAdmin
      .from('tracked_queries')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    const queryIds = (trackedQueries ?? []).map((q) => q.id);

    if (queryIds.length === 0) {
      return NextResponse.json({
        score: 0,
        components: {
          mention_rate: { value: 0, weight: 0.4, contribution: 0 },
          avg_position: { value: 0, weight: 0.2, contribution: 0 },
          sentiment: { value: 0, weight: 0.2, contribution: 0 },
          own_citation_rate: { value: 0, weight: 0.2, contribution: 0 },
        },
        trend: 0,
        trend_period: '30d',
      } as VisibilityScoreResult);
    }

    // Current period (last 30 days)
    const [currentMentions, currentCitations] = await Promise.all([
      supabaseAdmin
        .from('ai_mentions')
        .select('mentioned, position, sentiment_score, sentiment')
        .eq('business_id', businessId)
        .in('query_id', queryIds)
        .gte('scanned_at', thirtyDaysAgo),

      supabaseAdmin
        .from('citations')
        .select('is_own_domain')
        .eq('business_id', businessId)
        .gte('scan_date', thirtyDaysAgo),
    ]);

    // Previous period (30-60 days) for trend
    const [previousMentions, previousCitations] = await Promise.all([
      supabaseAdmin
        .from('ai_mentions')
        .select('mentioned, position, sentiment_score, sentiment')
        .eq('business_id', businessId)
        .in('query_id', queryIds)
        .gte('scanned_at', thirtyTo60DaysAgo)
        .lt('scanned_at', thirtyDaysAgo),

      supabaseAdmin
        .from('citations')
        .select('is_own_domain')
        .eq('business_id', businessId)
        .gte('scan_date', thirtyTo60DaysAgo)
        .lt('scan_date', thirtyDaysAgo),
    ]);

    // Current period calculations
    const currentMentionData = currentMentions.data ?? [];
    const mentionedCount = currentMentionData.filter((m) => m.mentioned).length;
    const totalMentions = currentMentionData.length;

    const positions = currentMentionData
      .filter((m) => m.mentioned && m.position)
      .map((m) => m.position);
    const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;

    const sentimentScores = currentMentionData
      .filter((m) => m.mentioned && m.sentiment_score !== null)
      .map((m) => m.sentiment_score);
    const sentimentScore = sentimentScores.length > 0
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
      : 0.5;

    const citationData = currentCitations.data ?? [];
    const ownCitations = citationData.filter((c) => c.is_own_domain).length;
    const totalCitations = citationData.length;

    const currentScore = calculateVisibilityScore({
      totalQueries: queryIds.length,
      mentionedQueries: mentionedCount,
      avgPosition,
      sentimentPositive: sentimentScore > 0.6 ? sentimentScores.length : 0,
      sentimentNeutral: sentimentScore >= 0.4 && sentimentScore <= 0.6 ? sentimentScores.length : 0,
      sentimentNegative: sentimentScore < 0.4 ? sentimentScores.length : 0,
      ownDomainCitations: ownCitations,
      totalCitations: totalCitations > 0 ? totalCitations : 1,
    });

    // Previous period calculations for trend
    const previousMentionData = previousMentions.data ?? [];
    const prevMentionedCount = previousMentionData.filter((m) => m.mentioned).length;
    const prevTotalMentions = previousMentionData.length;

    const prevPositions = previousMentionData
      .filter((m) => m.mentioned && m.position)
      .map((m) => m.position);
    const prevAvgPosition = prevPositions.length > 0 ? prevPositions.reduce((a, b) => a + b, 0) / prevPositions.length : null;

    const prevSentimentScores = previousMentionData
      .filter((m) => m.mentioned && m.sentiment_score !== null)
      .map((m) => m.sentiment_score);
    const prevSentimentScore = prevSentimentScores.length > 0
      ? prevSentimentScores.reduce((a, b) => a + b, 0) / prevSentimentScores.length
      : 0.5;

    const prevCitationData = previousCitations.data ?? [];
    const prevOwnCitations = prevCitationData.filter((c) => c.is_own_domain).length;
    const prevTotalCitations = prevCitationData.length;

    const previousScore = calculateVisibilityScore({
      totalQueries: queryIds.length,
      mentionedQueries: prevMentionedCount,
      avgPosition: prevAvgPosition,
      sentimentPositive: prevSentimentScore > 0.6 ? prevSentimentScores.length : 0,
      sentimentNeutral: prevSentimentScore >= 0.4 && prevSentimentScore <= 0.6 ? prevSentimentScores.length : 0,
      sentimentNegative: prevSentimentScore < 0.4 ? prevSentimentScores.length : 0,
      ownDomainCitations: prevOwnCitations,
      totalCitations: prevTotalCitations > 0 ? prevTotalCitations : 1,
    });

    const trend = Math.round((currentScore.score - previousScore.score) * 10) / 10;

    return NextResponse.json({
      score: currentScore.score,
      components: currentScore.components,
      trend,
      trend_period: '30d',
    } as VisibilityScoreResult);
  } catch (error) {
    requestLogger.error({ err: error }, 'Visibility score calculation failed');
    return NextResponse.json(
      { error: 'Failed to calculate visibility score' },
      { status: 500 }
    );
  }
}
