-- ============================================================
-- NOVA HEALTH CONSULTANCY — Role-Specific Profile Tables
-- Migration: 003_role_tables.sql
-- ============================================================
-- STRATEGY: Additive, non-breaking migration.
--
-- 1. Creates `patients` and `admins` tables that reference users(id).
-- 2. Migrates existing patient data from `users` into `patients`.
-- 3. Seeds an initial admin row for existing admin-role users.
-- 4. Does NOT drop or rename any existing columns — backward compatible.
-- 5. All existing foreign keys, RLS policies, and triggers remain intact.
-- ============================================================

-- ============================================================
-- TABLE: patients
-- Patient-specific profile data. 1:1 with users where role='patient'.
-- Previously this data was stored directly on the `users` table.
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dob               DATE,
  phone             TEXT,
  blood_type        TEXT,
  allergies         TEXT,
  emergency_contact TEXT,
  medical_history   TEXT,
  insurance_provider TEXT,
  insurance_id      TEXT,
  preferred_language TEXT        DEFAULT 'en',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

COMMENT ON TABLE patients IS 'Patient-specific profile data. 1:1 with users(role=patient). Separated from shared users table for clean architecture.';

-- ============================================================
-- TABLE: admins
-- Admin-specific profile data. 1:1 with users where role='admin'.
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department        TEXT,
  permissions       TEXT[]      NOT NULL DEFAULT '{all}',
  is_super_admin    BOOLEAN     NOT NULL DEFAULT false,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

COMMENT ON TABLE admins IS 'Admin-specific profile data. 1:1 with users(role=admin). Stores permissions and admin metadata.';

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- MIGRATE EXISTING DATA: users → patients
-- For every user with role='patient', copy patient-specific
-- fields into the new patients table. Non-destructive.
-- ============================================================
INSERT INTO patients (user_id, dob, phone, blood_type, allergies, emergency_contact, created_at)
SELECT
  id,
  dob,
  phone,
  blood_type,
  allergies,
  emergency_contact,
  created_at
FROM users
WHERE role = 'patient'
  AND id NOT IN (SELECT user_id FROM patients);

-- ============================================================
-- MIGRATE EXISTING DATA: users → admins
-- If any users have role='admin', create their admin profile.
-- ============================================================
INSERT INTO admins (user_id, is_super_admin, created_at)
SELECT
  id,
  true,
  created_at
FROM users
WHERE role = 'admin'
  AND id NOT IN (SELECT user_id FROM admins);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins   ENABLE ROW LEVEL SECURITY;

-- ── patients: users can read/update their own profile ─────────
CREATE POLICY "patients_read_own"
  ON patients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "patients_update_own"
  ON patients FOR UPDATE
  USING (user_id = auth.uid());

-- Admin (service role) inserts are not blocked — they bypass RLS.
-- No client-side insert policy needed (signup is server-side).

-- ── admins: admins can read their own profile ─────────────────
CREATE POLICY "admins_read_own"
  ON admins FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admins_update_own"
  ON admins FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- HELPER FUNCTION: get_user_role
-- Determines user role by checking profile tables.
-- Falls back to users.role if no profile table match.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check admins first (most restrictive)
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = p_user_id) THEN
    RETURN 'admin';
  END IF;

  -- Check doctors
  IF EXISTS (SELECT 1 FROM doctor_profiles WHERE user_id = p_user_id) THEN
    RETURN 'doctor';
  END IF;

  -- Check patients
  IF EXISTS (SELECT 1 FROM patients WHERE user_id = p_user_id) THEN
    RETURN 'patient';
  END IF;

  -- Fallback: read from users table
  SELECT role::TEXT INTO v_role FROM users WHERE id = p_user_id;
  RETURN COALESCE(v_role, 'patient');
END;
$$;

COMMENT ON FUNCTION get_user_role IS 'Determines user role by checking profile tables (admins, doctor_profiles, patients). Used by backend after login.';

-- ============================================================
-- REALTIME: Enable new tables if needed
-- ============================================================
-- Patients and admins don't need realtime for now, but can be
-- enabled later if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE patients;
-- ALTER PUBLICATION supabase_realtime ADD TABLE admins;
