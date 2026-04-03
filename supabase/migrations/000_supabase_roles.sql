-- 000_supabase_roles.sql
-- Sets up the minimal Supabase role hierarchy needed by PostgREST.
-- This is pre-installed in a real Supabase project; we recreate it
-- for the local Docker stack.

-- ── Roles ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  END IF;
END $$;

-- authenticator can switch to any of the JWT roles
GRANT anon        TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role  TO authenticator;

-- Grant usage on public schema to all API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL   ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future tables/functions inherit the grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ── auth schema + uid() stub (required by RLS policies) ──────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

-- auth.uid() returns the user ID embedded in the JWT (set by PostgREST GUC)
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
  LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', TRUE)::json->>'sub',
    (current_setting('request.jwt.claims', TRUE)::json->>'id')
  )::UUID;
$$;

GRANT USAGE  ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
