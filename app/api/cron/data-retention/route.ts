import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/request-context';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription } from '@/lib/stripe';

/**
 * GET /api/cron/data-retention
 * Runs on a scheduled basis (daily, configured in vercel.json)
 * Deletes old data (mentions, citations, snapshots) based on user's plan retention limits
 *
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger(request, { route: '/api/cron/data-retention' });
  // Verify cron secret
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== process.env.CRON_SECRET) {
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

  const deletionLog: Record<string, { table: string; count: number }[]> = {};

  try {
    // Get all unique users with businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('user_id')
      .is('deleted_at', null);

    if (businessesError) {
      requestLogger.error({ error: businessesError }, 'Failed to fetch businesses for retention run');
      return NextResponse.json(
        { error: 'Failed to fetch businesses' },
        { status: 500 }
      );
    }

    const uniqueUserIds = [...new Set((businesses as any[])?.map((b) => b.user_id) ?? [])];

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        // Get user's subscription and retention days
        const subscription = await getUserSubscription(userId);
        const retentionDays = subscription.data_retention_days ?? 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffISO = cutoffDate.toISOString();

        // Get user's businesses for filtering
        const { data: userBusinesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', userId)
          .is('deleted_at', null);

        const businessIds = (userBusinesses as any[])?.map((b) => b.id) ?? [];

        if (businessIds.length === 0) continue;

        // Delete old ai_mentions
        const { count: mentionsCount, error: mentionsError } = await supabase
          .from('ai_mentions')
          .delete()
          .in('business_id', businessIds)
          .lt('created_at', cutoffISO);

        if (mentionsError) {
          requestLogger.error({ error: mentionsError, userId }, 'Failed to delete old ai_mentions');
        } else if (mentionsCount) {
          if (!deletionLog[userId]) deletionLog[userId] = [];
          deletionLog[userId].push({ table: 'ai_mentions', count: mentionsCount });
        }

        // Delete old citations
        const { count: citationsCount, error: citationsError } = await supabase
          .from('citations')
          .delete()
          .in('business_id', businessIds)
          .lt('created_at', cutoffISO);

        if (citationsError) {
          requestLogger.error({ error: citationsError, userId }, 'Failed to delete old citations');
        } else if (citationsCount) {
          if (!deletionLog[userId]) deletionLog[userId] = [];
          deletionLog[userId].push({ table: 'citations', count: citationsCount });
        }

        // Delete old seo_snapshots
        const { count: snapshotsCount, error: snapshotsError } = await supabase
          .from('seo_snapshots')
          .delete()
          .in('business_id', businessIds)
          .lt('created_at', cutoffISO);

        if (snapshotsError) {
          requestLogger.error({ error: snapshotsError, userId }, 'Failed to delete old SEO snapshots');
        } else if (snapshotsCount) {
          if (!deletionLog[userId]) deletionLog[userId] = [];
          deletionLog[userId].push({ table: 'seo_snapshots', count: snapshotsCount });
        }

        requestLogger.info(
          {
            userId,
            cutoffISO,
            deletions: deletionLog[userId] ?? [],
            retentionDays,
            plan: subscription.plan,
          },
          'Completed data retention cleanup for user',
        );
      } catch (err) {
        requestLogger.error({ err, userId }, 'Failed to process data retention for user');
      }
    }

    // Summary
    const totalUsers = Object.keys(deletionLog).length;
    const totalRecords = Object.values(deletionLog).reduce(
      (sum, deletes) => sum + deletes.reduce((s, d) => s + d.count, 0),
      0
    );

    requestLogger.info(
      { totalUsers, totalRecords, usersProcessed: uniqueUserIds.length },
      'Data retention cron completed',
    );

    return NextResponse.json({
      success: true,
      summary: {
        usersProcessed: uniqueUserIds.length,
        usersWithDeletions: totalUsers,
        totalRecordsDeleted: totalRecords,
        timestamp: new Date().toISOString(),
      },
      details: deletionLog,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    requestLogger.error({ err: error, message }, 'Data retention cron failed');
    return NextResponse.json(
      { error: 'Cron job failed', details: message },
      { status: 500 }
    );
  }
}
