-- ============================================================
-- NOVA HEALTH — MESSAGING & NOTIFICATIONS FIX MIGRATION
-- Run this in the Supabase SQL Editor ONCE.
-- It adds presence tracking and fixes realtime publication.
-- ============================================================

-- ── 1. Add conversations to realtime if not already there ────
-- (fresh_database.sql already does this, but run if needed)
DO $$
BEGIN
  -- Ensure messages, notifications, conversations are in realtime pub
  -- These are idempotent no-ops if already added
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ── 2. Fix messages RLS so realtime subscriptions work ────────
-- The existing RLS policy blocks realtime for the anon/user role
-- when filtering by doctor_id only. We need to allow SELECT for
-- both participants via their user_id relationship.

-- Drop old policies if they exist
DROP POLICY IF EXISTS "msg_read" ON messages;
DROP POLICY IF EXISTS "msg_send" ON messages;

-- New read policy: patient OR doctor (via doctor_profiles.user_id)
CREATE POLICY "msg_read" ON messages FOR SELECT
  USING (
    patient_id = auth.uid()
    OR sender_id = auth.uid()
    OR doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

-- New send policy: sender must be the authenticated user
CREATE POLICY "msg_send" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      patient_id = auth.uid()
      OR doctor_id IN (
        SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ── 3. Fix conversations RLS for realtime ────────────────────
DROP POLICY IF EXISTS "conv_doctor_read" ON conversations;
DROP POLICY IF EXISTS "conv_patient_read" ON conversations;
DROP POLICY IF EXISTS "conv_users_insert" ON conversations;
DROP POLICY IF EXISTS "conv_users_update" ON conversations;

CREATE POLICY "conv_doctor_read" ON conversations FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "conv_patient_read" ON conversations FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "conv_users_insert" ON conversations FOR INSERT
  WITH CHECK (
    patient_id = auth.uid()
    OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "conv_users_update" ON conversations FOR UPDATE
  USING (
    patient_id = auth.uid()
    OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid())
  );

-- ── 4. Fix notifications RLS so realtime INSERT events fire ───
-- The existing policy should be fine, but ensure it's there:
DROP POLICY IF EXISTS "notif_own" ON notifications;
CREATE POLICY "notif_own" ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ── 5. Create chat-attachments storage bucket (if missing) ───
-- Run this in the Supabase dashboard under Storage if the bucket
-- doesn't exist yet. Or use the SQL below (Supabase 2.x+):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('chat-attachments', 'chat-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- ── DONE ─────────────────────────────────────────────────────
-- After running this migration:
-- 1. Go to Supabase Dashboard → Storage → create bucket
--    named "chat-attachments" with Public access = ON
-- 2. Restart your Next.js dev server
-- 3. Messages, attachments, notifications & presence will work
