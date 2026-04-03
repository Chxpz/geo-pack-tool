import { supabaseAdmin } from '@/lib/supabase';
import type { ScanRunProgress, ScanRunResult } from '@/lib/scanner';

export type ScanRunStatus = 'processing' | 'completed' | 'failed';

export interface ScanRunRecord {
  id: string;
  business_id: string;
  user_id: string;
  status: ScanRunStatus;
  requested_query_ids: string[];
  requested_query_count: number;
  scanned_queries: number;
  mentions_found: number;
  errors_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createScanRun(params: {
  businessId: string;
  userId: string;
  queryIds: string[];
}): Promise<ScanRunRecord> {
  if (!supabaseAdmin) {
    throw new Error('Database connection failed');
  }

  const { data, error } = await supabaseAdmin
    .from('scan_runs')
    .insert({
      business_id: params.businessId,
      user_id: params.userId,
      status: 'processing',
      requested_query_ids: params.queryIds,
      requested_query_count: params.queryIds.length,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create scan run: ${error?.message ?? 'unknown error'}`);
  }

  return data as ScanRunRecord;
}

export async function markScanRunCompleted(scanRunId: string, result: ScanRunResult): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database connection failed');
  }

  const { error } = await supabaseAdmin
    .from('scan_runs')
    .update({
      status: 'completed',
      scanned_queries: result.scanned,
      mentions_found: result.mentions,
      errors_count: result.errors,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', scanRunId);

  if (error) {
    throw new Error(`Failed to complete scan run: ${error.message}`);
  }
}

export async function markScanRunFailed(scanRunId: string, errorMessage: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database connection failed');
  }

  const { error } = await supabaseAdmin
    .from('scan_runs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanRunId);

  if (error) {
    throw new Error(`Failed to fail scan run: ${error.message}`);
  }
}

export async function updateScanRunProgress(
  scanRunId: string,
  progress: ScanRunProgress,
): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Database connection failed');
  }

  const { error } = await supabaseAdmin
    .from('scan_runs')
    .update({
      requested_query_count: progress.totalQueries,
      scanned_queries: progress.scanned,
      mentions_found: progress.mentions,
      errors_count: progress.errors,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scanRunId);

  if (error) {
    throw new Error(`Failed to update scan progress: ${error.message}`);
  }
}
