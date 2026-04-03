import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSubscription, PLAN_CONFIG } from '@/lib/stripe';

/**
 * GET /api/cron/data-retention
 * Runs on a scheduled basis (daily, configured in vercel.json)
 * Deletes old data (mentions, citations, snapshots) based on user's plan retention limits
 *
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
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
      console.error('Error fetching businesses:', businessesError);
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
          console.error(`Error deleting mentions for user ${userId}:`, mentionsError);
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
          console.error(`Error deleting citations for user ${userId}:`, citationsError);
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
          console.error(`Error deleting snapshots for user ${userId}:`, snapshotsError);
        } else if (snapshotsCount) {
          if (!deletionLog[userId]) deletionLog[userId] = [];
          deletionLog[userId].push({ table: 'seo_snapshots', count: snapshotsCount });
        }

        console.log(`[data-retention] User ${userId}: deleted records older than ${cutoffISO}`, {
          deletions: deletionLog[userId] ?? [],
          retentionDays,
          plan: subscription.plan,
        });
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err);
      }
    }

    // Summary
    const totalUsers = Object.keys(deletionLog).length;
    const totalRecords = Object.values(deletionLog).reduce(
      (sum, deletes) => sum + deletes.reduce((s, d) => s + d.count, 0),
      0
    );

    console.log(`[data-retention] Complete: ${totalUsers} users, ${totalRecords} records deleted`);

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
    console.error('[data-retention] Fatal error:', message);
    return NextResponse.json(
      { error: 'Cron job failed', details: message },
      { status: 500 }
    );
  }
}
