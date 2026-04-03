-- Reports table for storing generated reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ai_visibility', 'competitor_analysis', 'seo_intelligence')),
  business_name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  file_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports(user_id);
CREATE INDEX IF NOT EXISTS reports_business_id_idx ON reports(business_id);
CREATE INDEX IF NOT EXISTS reports_generated_at_idx ON reports(generated_at DESC);

-- RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);
