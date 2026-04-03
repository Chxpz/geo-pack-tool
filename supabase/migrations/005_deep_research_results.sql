-- Deep research async result storage for AI Concierge polling
CREATE TABLE IF NOT EXISTS deep_research_results (
  id TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'processing', 'completed', 'failed')),
  response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deep_research_results_business_id_idx
  ON deep_research_results (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS deep_research_results_user_id_idx
  ON deep_research_results (user_id, created_at DESC);

ALTER TABLE deep_research_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deep research results"
  ON deep_research_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deep research results"
  ON deep_research_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deep research results"
  ON deep_research_results FOR UPDATE
  USING (auth.uid() = user_id);
