-- Persisted scan runs for business visibility scans
CREATE TABLE IF NOT EXISTS scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  requested_query_ids JSONB NOT NULL DEFAULT '[]',
  requested_query_count INTEGER NOT NULL DEFAULT 0,
  scanned_queries INTEGER NOT NULL DEFAULT 0,
  mentions_found INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_runs_business_id_idx
  ON scan_runs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scan_runs_user_id_idx
  ON scan_runs (user_id, created_at DESC);

ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan runs"
  ON scan_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan runs"
  ON scan_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scan runs"
  ON scan_runs FOR UPDATE
  USING (auth.uid() = user_id);
