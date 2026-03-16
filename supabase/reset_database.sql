-- ============================================================
-- NOVA HEALTH — DATABASE RESET SCRIPT
-- Run this in Supabase SQL Editor to clean all data.
-- After running, re-run fresh_database.sql to rebuild schema.
-- ============================================================

-- ── Step 1: Delete all data from public tables ────────────────
-- Order matters due to foreign key constraints
TRUNCATE TABLE blog_likes CASCADE;
TRUNCATE TABLE blog_comments CASCADE;
TRUNCATE TABLE blog_posts CASCADE;
TRUNCATE TABLE blog_categories CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE remind_me CASCADE;
TRUNCATE TABLE saved_doctors CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE consultation_queue CASCADE;
TRUNCATE TABLE consultations CASCADE;
TRUNCATE TABLE doctor_availability CASCADE;
TRUNCATE TABLE doctor_profiles CASCADE;
TRUNCATE TABLE patients CASCADE;
TRUNCATE TABLE admins CASCADE;
TRUNCATE TABLE users CASCADE;

-- ── Step 2: Remove all auth.users ─────────────────────────────
-- This removes ALL authentication records from Supabase Auth.
-- After this, everyone must re-register.
DELETE FROM auth.users;

-- ── Step 3: Reset identity sequences ──────────────────────────
-- Some Supabase internals use sequences; this resets them.
-- (Safe to skip if not using serial/identity columns)

-- ============================================================
-- DONE! Database is now clean.
-- ============================================================
-- Next steps:
--   1. Run fresh_database.sql to recreate schema + admin account
--   2. Register doctors at /doctor-login  
--   3. Register patients at /login
--   4. Verify doctors via /admin-dashboard (admin@novahealth.test / password123)
-- ============================================================
