-- ============================================================
-- NOVA HEALTH CONSULTANCY — Auth RLS Patch
-- Migration: 002_fix_auth_rls.sql
-- ============================================================
-- Run this in Supabase SQL Editor AFTER 001_schema.sql.
--
-- Problem: The original "users_insert_self" policy uses
--   WITH CHECK (id = auth.uid())
-- During supabase.auth.signUp(), the session is not yet
-- established when the INSERT runs, so auth.uid() returns NULL
-- and the insert is silently rejected. This causes:
--   - repeated signup attempts → "email rate limit exceeded"
--   - orphaned auth.users rows with no public.users profile
--
-- Fix: Drop the old client-side insert policy.
-- The public.users INSERT is now done exclusively by the server
-- route (/api/auth/signup) using the service role client, which
-- bypasses RLS entirely. No client-side insert policy is needed.
-- ============================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "users_insert_self" ON users;

-- Keep read and update policies intact (they are correct):
--   "users_read_own"   → SELECT where id = auth.uid()
--   "users_update_own" → UPDATE where id = auth.uid()

-- Verify: after this patch the only way to INSERT into public.users
-- is via the service role key (server-side), which is correct.
-- The anon key / authenticated key cannot insert — that is intentional.
