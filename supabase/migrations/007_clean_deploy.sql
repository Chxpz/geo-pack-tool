-- 007_clean_deploy.sql
-- Clean production schema: replace Otterly-shaped geo_audits with Stack3 Audit aligned table,
-- remove otterly_access from subscriptions, update ai_platforms, and fix constraints.

-- ─── 6.1 Drop and recreate geo_audits (Stack3 Audit aligned) ────────────────

DROP TABLE IF EXISTS geo_audits CASCADE;

CREATE TABLE geo_audits (
  -- Identity
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Async job tracking
  stack3_audit_id        VARCHAR(50) NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'queued'
                           CHECK (status IN ('queued','crawling','analyzing','generating','complete','failed')),
  error_message          TEXT,

  -- Audit metadata
  audit_type             TEXT NOT NULL DEFAULT 'on_demand'
                           CHECK (audit_type IN ('on_demand','scheduled')),
  audit_date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pages_crawled          INTEGER,
  audit_duration_ms      INTEGER,
  report_url             TEXT,
  report_format          VARCHAR(10),

  -- Top-level score
  overall_score          NUMERIC(5,2),
  verdict                VARCHAR(20),

  -- 3 grouped scores (derived from 12 dimensions)
  crawlability_score     NUMERIC(5,2),
  content_score          NUMERIC(5,2),
  structured_data_score  NUMERIC(5,2),

  -- Full 12-dimension output
  dimension_scores       JSONB NOT NULL DEFAULT '[]',

  -- Findings and actions
  findings               JSONB NOT NULL DEFAULT '[]',
  action_plan            JSONB NOT NULL DEFAULT '{}',
  quick_wins             JSONB NOT NULL DEFAULT '[]',
  does_well              JSONB NOT NULL DEFAULT '[]',
  missing_for_citation   JSONB NOT NULL DEFAULT '[]',

  -- SWOT
  strengths              JSONB NOT NULL DEFAULT '[]',
  weaknesses             JSONB NOT NULL DEFAULT '[]',
  opportunities          JSONB NOT NULL DEFAULT '[]',
  threats                JSONB NOT NULL DEFAULT '[]',

  -- User-managed recommendations
  recommendations        JSONB NOT NULL DEFAULT '[]',

  -- Per-page breakdown
  page_notes             JSONB NOT NULL DEFAULT '[]',

  -- Timestamps
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_geo_audits_business_id     ON geo_audits(business_id);
CREATE INDEX idx_geo_audits_user_id         ON geo_audits(user_id);
CREATE INDEX idx_geo_audits_stack3_audit_id ON geo_audits(stack3_audit_id);
CREATE INDEX idx_geo_audits_status          ON geo_audits(status);
CREATE INDEX idx_geo_audits_audit_date      ON geo_audits(audit_date DESC);

-- RLS policies
ALTER TABLE geo_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY geo_audits_customer_select ON geo_audits FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY geo_audits_customer_insert ON geo_audits FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY geo_audits_customer_update ON geo_audits FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY geo_audits_operator_all ON geo_audits FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'));

-- ─── 6.2 Remove otterly_access, add audit limits ────────────────────────────

ALTER TABLE subscriptions DROP COLUMN IF EXISTS otterly_access;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS max_geo_audits_per_month INTEGER NOT NULL DEFAULT 1;

-- ─── 6.3 Update ai_platforms scan_method ─────────────────────────────────────

UPDATE ai_platforms
  SET scan_method = 'coming_soon'
  WHERE scan_method = 'otterly_only';

-- ─── 6.4 Remove otterly operator task types ──────────────────────────────────

ALTER TABLE operator_tasks DROP CONSTRAINT IF EXISTS operator_tasks_task_type_check;
ALTER TABLE operator_tasks ADD CONSTRAINT operator_tasks_task_type_check
  CHECK (task_type IN ('geo_audit', 'manual_review', 'support'));

-- ─── 6.5 Remove otterly import types ─────────────────────────────────────────

ALTER TABLE data_imports DROP CONSTRAINT IF EXISTS data_imports_import_type_check;
ALTER TABLE data_imports ADD CONSTRAINT data_imports_import_type_check
  CHECK (import_type IN ('manual_upload'));
