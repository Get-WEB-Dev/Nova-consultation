-- ============================================================
-- NOVA HEALTH — Add Structured Notes to Consultations
-- Run in Supabase SQL Editor
-- ============================================================

-- Add structured medical note columns
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS prescription TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS follow_up_plan TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS outcome TEXT; -- completed, follow_up, referred, emergency
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS follow_up_priority TEXT; -- low, medium, high

-- Index for pending tasks query (consultations without structured notes)
CREATE INDEX IF NOT EXISTS idx_consult_pending_notes
  ON consultations(doctor_id)
  WHERE status = 'completed' AND diagnosis IS NULL;

-- ============================================================
-- DONE! Run this once in Supabase SQL Editor.
-- ============================================================
