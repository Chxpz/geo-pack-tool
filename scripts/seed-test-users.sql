-- AgenticRev test seed accounts (one per plan)
-- Run: PGPASSWORD=postgres psql -h localhost -p 5433 -U supabase_admin -d postgres -f scripts/seed-test-users.sql

DELETE FROM users WHERE email LIKE '%@test.agenticrev.local';

INSERT INTO users (id, email, password_hash, full_name, company_name, oauth_provider, email_verified, email_verified_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'free@test.agenticrev.local',    '$2b$12$nQbHDYYHFM7CUiZioq63se8gMgf93vSHSyXBNJ38CFR8gnKKHh4nG', 'Free User',    'Free Corp',    'email', true, now()),
  ('00000000-0000-0000-0000-000000000002', 'starter@test.agenticrev.local', '$2b$12$nQbHDYYHFM7CUiZioq63se8gMgf93vSHSyXBNJ38CFR8gnKKHh4nG', 'Starter User', 'Starter Corp', 'email', true, now()),
  ('00000000-0000-0000-0000-000000000003', 'growth@test.agenticrev.local',  '$2b$12$nQbHDYYHFM7CUiZioq63se8gMgf93vSHSyXBNJ38CFR8gnKKHh4nG', 'Growth User',  'Growth Corp',  'email', true, now()),
  ('00000000-0000-0000-0000-000000000004', 'agency@test.agenticrev.local',  '$2b$12$nQbHDYYHFM7CUiZioq63se8gMgf93vSHSyXBNJ38CFR8gnKKHh4nG', 'Agency User',  'Agency Corp',  'email', true, now());

DELETE FROM subscriptions WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);

INSERT INTO subscriptions (user_id, plan, status, max_products, max_stores, historical_data_days, acp_enabled, price_per_month, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'free',    'active', 10,   1,    7,   false, 0,   NULL),
  ('00000000-0000-0000-0000-000000000002', 'starter', 'active', 100,  2,    30,  false, 29,  (now() + interval '30 days')),
  ('00000000-0000-0000-0000-000000000003', 'growth',  'active', 500,  5,    90,  false, 99,  (now() + interval '30 days')),
  ('00000000-0000-0000-0000-000000000004', 'agency',  'active', NULL, NULL, 365, true,  299, (now() + interval '30 days'));

SELECT u.email, s.plan, s.max_products, s.max_stores, s.acp_enabled
FROM users u
JOIN subscriptions s ON s.user_id = u.id
WHERE u.email LIKE '%@test.agenticrev.local'
ORDER BY s.price_per_month;
