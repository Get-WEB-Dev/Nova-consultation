-- ============================================================
-- NOVA HEALTH CONSULTANCY — FRESH DATABASE SCRIPT
-- Supabase/PostgreSQL Compatible
-- Generated: 2026-03-12
-- ============================================================
-- WARNING: This script DROPS all existing tables and recreates
-- the entire database from scratch. Run in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- PART 1: DROP EVERYTHING SAFELY
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_doctor_profiles_updated_at ON doctor_profiles;
DROP TRIGGER IF EXISTS trg_consultations_updated_at ON consultations;
DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
DROP TRIGGER IF EXISTS trg_aggregate_doctor_rating ON reviews;
DROP TRIGGER IF EXISTS trg_generate_video_room ON consultations;
DROP TRIGGER IF EXISTS trg_notify_doctor_available ON doctor_profiles;

-- Drop functions
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS recalculate_queue_positions(UUID) CASCADE;
DROP FUNCTION IF EXISTS aggregate_doctor_rating() CASCADE;
DROP FUNCTION IF EXISTS generate_video_room_name() CASCADE;
DROP FUNCTION IF EXISTS notify_doctor_available() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;

-- Drop tables (order matters for FK constraints)
DROP TABLE IF EXISTS blog_likes CASCADE;
DROP TABLE IF EXISTS blog_comments CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS blog_categories CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS remind_me CASCADE;
DROP TABLE IF EXISTS saved_doctors CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS consultation_queue CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS doctor_availability CASCADE;
DROP TABLE IF EXISTS doctor_profiles CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS doctor_status CASCADE;
DROP TYPE IF EXISTS consultation_type CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS consult_status CASCADE;
DROP TYPE IF EXISTS queue_status CASCADE;
DROP TYPE IF EXISTS notif_type CASCADE;
DROP TYPE IF EXISTS message_sender CASCADE;
DROP TYPE IF EXISTS attachment_type CASCADE;

-- Clean up auth.users seed data
DELETE FROM auth.users WHERE email LIKE '%@novahealth.test';

-- ============================================================
-- PART 2: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PART 3: ENUM TYPES
-- ============================================================
CREATE TYPE user_role         AS ENUM ('patient', 'doctor', 'professional', 'admin');
CREATE TYPE doctor_status     AS ENUM ('available', 'busy', 'in_consultation', 'offline');
CREATE TYPE consultation_type AS ENUM ('video', 'in_person', 'both');
CREATE TYPE gender_type       AS ENUM ('male', 'female', 'other');
CREATE TYPE consult_status    AS ENUM ('active', 'completed', 'missed', 'follow_up', 'waiting', 'cancelled');
CREATE TYPE queue_status      AS ENUM ('waiting', 'called', 'skipped', 'joined', 'left');
CREATE TYPE notif_type        AS ENUM (
  'doctor_available', 'queue_called', 'follow_up',
  'consultation_complete', 'saved_doctor_online', 'chat', 'system'
);
CREATE TYPE message_sender    AS ENUM ('patient', 'doctor');
CREATE TYPE attachment_type   AS ENUM ('image', 'pdf', 'document', 'other');

-- ============================================================
-- PART 4: TABLES
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  phone             TEXT,
  dob               DATE,
  avatar_url        TEXT,
  bio               TEXT,
  blood_type        TEXT,
  allergies         TEXT,
  emergency_contact TEXT,
  role              user_role   NOT NULL DEFAULT 'patient',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role  ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ── patients ─────────────────────────────────────────────────
CREATE TABLE patients (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dob                DATE,
  phone              TEXT,
  blood_type         TEXT,
  allergies          TEXT,
  emergency_contact  TEXT,
  medical_history    TEXT,
  insurance_provider TEXT,
  insurance_id       TEXT,
  preferred_language TEXT        DEFAULT 'en',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patients_user_id ON patients(user_id);

-- ── admins ───────────────────────────────────────────────────
CREATE TABLE admins (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department     TEXT,
  permissions    TEXT[]      NOT NULL DEFAULT '{all}',
  is_super_admin BOOLEAN     NOT NULL DEFAULT false,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admins_user_id ON admins(user_id);

-- ── doctor_profiles ──────────────────────────────────────────
CREATE TABLE doctor_profiles (
  id                         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty                  TEXT          NOT NULL,
  hospital                   TEXT,
  experience_years           INT           NOT NULL DEFAULT 0,
  rating                     NUMERIC(3,2)  NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count               INT           NOT NULL DEFAULT 0,
  fee                        NUMERIC(10,2) NOT NULL DEFAULT 0,
  languages                  TEXT[]        NOT NULL DEFAULT '{}',
  tags                       TEXT[]        NOT NULL DEFAULT '{}',
  gender                     gender_type,
  patients_served            INT           NOT NULL DEFAULT 0,
  consultation_type          consultation_type NOT NULL DEFAULT 'video',
  status                     doctor_status NOT NULL DEFAULT 'offline',
  location_city              TEXT,
  consultation_duration_mins INT           NOT NULL DEFAULT 15,
  next_available_slot        TEXT,
  video_provider_identity    TEXT,
  slug                       TEXT          UNIQUE,
  is_verified                BOOLEAN       NOT NULL DEFAULT false,
  is_published               BOOLEAN       NOT NULL DEFAULT false,
  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_dp_user_id   ON doctor_profiles(user_id);
CREATE INDEX idx_dp_status    ON doctor_profiles(status);
CREATE INDEX idx_dp_specialty ON doctor_profiles(specialty);
CREATE INDEX idx_dp_slug      ON doctor_profiles(slug);

-- ── doctor_availability ──────────────────────────────────────
CREATE TABLE doctor_availability (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INT         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_avail_doctor ON doctor_availability(doctor_id);

-- ── consultations ────────────────────────────────────────────
CREATE TABLE consultations (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id              UUID          NOT NULL REFERENCES doctor_profiles(id),
  patient_id             UUID          NOT NULL REFERENCES users(id),
  status                 consult_status NOT NULL DEFAULT 'waiting',
  is_follow_up           BOOLEAN       NOT NULL DEFAULT false,
  follow_up_scheduled_at TIMESTAMPTZ,
  started_at             TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  duration_minutes       INT,
  notes                  TEXT,
  summary                TEXT,
  symptoms               TEXT,
  duration_description   TEXT,
  video_room_name        TEXT          UNIQUE,
  video_session_token    TEXT,
  patient_rating         INT           CHECK (patient_rating BETWEEN 1 AND 5),
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_consult_doctor  ON consultations(doctor_id);
CREATE INDEX idx_consult_patient ON consultations(patient_id);
CREATE INDEX idx_consult_status  ON consultations(status);
CREATE INDEX idx_consult_followup ON consultations(is_follow_up, follow_up_scheduled_at) WHERE is_follow_up = true;
CREATE INDEX idx_consult_active  ON consultations(doctor_id, status) WHERE status IN ('active', 'waiting');

-- ── consultation_queue ───────────────────────────────────────
CREATE TABLE consultation_queue (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_id   UUID        REFERENCES consultations(id),
  queue_position    INT         NOT NULL,
  estimated_wait_mins INT       NOT NULL DEFAULT 0,
  status            queue_status NOT NULL DEFAULT 'waiting',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at         TIMESTAMPTZ,
  UNIQUE (doctor_id, patient_id, status) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX idx_queue_doctor   ON consultation_queue(doctor_id, status);
CREATE INDEX idx_queue_patient  ON consultation_queue(patient_id, status);
CREATE INDEX idx_queue_position ON consultation_queue(doctor_id, queue_position) WHERE status = 'waiting';

-- ── conversations ──────────────────────────────────────────────
CREATE TABLE conversations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id            UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_preview TEXT,
  last_message_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, patient_id)
);

-- ── messages ─────────────────────────────────────────────────
CREATE TABLE messages (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID           REFERENCES conversations(id) ON DELETE CASCADE,
  consultation_id UUID           REFERENCES consultations(id) ON DELETE CASCADE,
  doctor_id       UUID           REFERENCES doctor_profiles(id),
  patient_id      UUID           REFERENCES users(id),
  sender_id       UUID           NOT NULL REFERENCES users(id),
  sender_role     message_sender NOT NULL,
  body            TEXT,
  attachment_url  TEXT,
  attachment_name TEXT,
  attachment_type attachment_type,
  attachment_size INT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_consultation ON messages(consultation_id, created_at);
CREATE INDEX idx_msg_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_msg_conversation_history ON messages(doctor_id, patient_id, created_at);
CREATE INDEX idx_msg_sender       ON messages(sender_id);

-- ── saved_doctors ────────────────────────────────────────────
CREATE TABLE saved_doctors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);
CREATE INDEX idx_sd_patient ON saved_doctors(patient_id);
CREATE INDEX idx_sd_doctor  ON saved_doctors(doctor_id);

-- ── remind_me ────────────────────────────────────────────────
CREATE TABLE remind_me (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id   UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  notified    BOOLEAN     NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);
CREATE INDEX idx_rm_doctor  ON remind_me(doctor_id) WHERE notified = false;
CREATE INDEX idx_rm_patient ON remind_me(patient_id);

-- ── notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          notif_type  NOT NULL,
  title         TEXT        NOT NULL,
  message       TEXT,
  read          BOOLEAN     NOT NULL DEFAULT false,
  doctor_name   TEXT,
  doctor_avatar TEXT,
  action_url    TEXT,
  ref_id        UUID,
  ref_table     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user   ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notif_unread ON notifications(user_id) WHERE read = false;

-- ── reviews ──────────────────────────────────────────────────
CREATE TABLE reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID        NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  doctor_id       UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_published    BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rev_doctor  ON reviews(doctor_id, created_at DESC);
CREATE INDEX idx_rev_patient ON reviews(patient_id);

-- ── blog_categories ──────────────────────────────────────────
CREATE TABLE blog_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── blog_posts ───────────────────────────────────────────────
CREATE TABLE blog_posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  category_id      UUID        REFERENCES blog_categories(id),
  title            TEXT        NOT NULL,
  slug             TEXT        NOT NULL UNIQUE,
  content          TEXT        NOT NULL,
  excerpt          TEXT,
  cover_image      TEXT,
  thumbnail        TEXT,
  video_url        TEXT,
  tags             TEXT[]      NOT NULL DEFAULT '{}',
  likes            INT         NOT NULL DEFAULT 0,
  comment_count    INT         NOT NULL DEFAULT 0,
  meta_title       TEXT,
  meta_description TEXT,
  is_published     BOOLEAN     NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bp_doctor    ON blog_posts(doctor_id);
CREATE INDEX idx_bp_published ON blog_posts(published_at DESC) WHERE is_published = true;
CREATE INDEX idx_bp_slug      ON blog_posts(slug);
CREATE INDEX idx_bp_category  ON blog_posts(category_id);
CREATE INDEX idx_bp_tags      ON blog_posts USING GIN(tags);

-- ── blog_comments ────────────────────────────────────────────
CREATE TABLE blog_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES users(id),
  body        TEXT        NOT NULL,
  is_approved BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bc_post ON blog_comments(post_id, created_at);

-- ── blog_likes ───────────────────────────────────────────────
CREATE TABLE blog_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX idx_bl_post ON blog_likes(post_id);
CREATE INDEX idx_bl_user ON blog_likes(user_id);

-- ============================================================
-- PART 5: FUNCTIONS & TRIGGERS
-- ============================================================

-- ── updated_at trigger function ──────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Queue position recalculation ─────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_queue_positions(p_doctor_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consultation_queue q
  SET queue_position = sub.new_pos,
      estimated_wait_mins = (sub.new_pos - 1) * (
        SELECT consultation_duration_mins FROM doctor_profiles WHERE id = p_doctor_id
      )
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) AS new_pos
    FROM consultation_queue WHERE doctor_id = p_doctor_id AND status = 'waiting'
  ) sub WHERE q.id = sub.id;
END;
$$;

-- ── Aggregate doctor rating ──────────────────────────────────
CREATE OR REPLACE FUNCTION aggregate_doctor_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE doctor_profiles SET
    rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE doctor_id = NEW.doctor_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE doctor_id = NEW.doctor_id)
  WHERE id = NEW.doctor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aggregate_doctor_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION aggregate_doctor_rating();

-- ── Auto-generate video room name ────────────────────────────
CREATE OR REPLACE FUNCTION generate_video_room_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.video_room_name IS NULL THEN
    NEW.video_room_name := 'nova-' || REPLACE(NEW.id::TEXT, '-', '')::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_video_room
  BEFORE INSERT ON consultations
  FOR EACH ROW EXECUTE FUNCTION generate_video_room_name();

-- ── Notify when doctor becomes available ─────────────────────
CREATE OR REPLACE FUNCTION notify_doctor_available()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status != 'available' AND NEW.status = 'available' THEN
    INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url, ref_id, ref_table)
    SELECT rm.patient_id, 'doctor_available', 'Doctor is now available',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id)
        || ' is now available for an instant consultation.',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id),
      '/doctor/' || COALESCE(NEW.slug, NEW.id::TEXT), NEW.id, 'doctor_profiles'
    FROM remind_me rm WHERE rm.doctor_id = NEW.id AND rm.notified = false;

    UPDATE remind_me SET notified = true, notified_at = now() WHERE doctor_id = NEW.id AND notified = false;

    INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url, ref_id, ref_table)
    SELECT sd.patient_id, 'saved_doctor_online', 'Saved doctor is online',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id)
        || ', a doctor you saved, is now online.',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id),
      '/doctor/' || COALESCE(NEW.slug, NEW.id::TEXT), NEW.id, 'doctor_profiles'
    FROM saved_doctors sd WHERE sd.doctor_id = NEW.id
      AND sd.patient_id NOT IN (
        SELECT patient_id FROM remind_me WHERE doctor_id = NEW.id AND notified = true AND notified_at >= now() - INTERVAL '1 minute'
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_doctor_available
  AFTER UPDATE OF status ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION notify_doctor_available();

-- ── Role lookup helper ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE v_role TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = p_user_id) THEN RETURN 'admin'; END IF;
  IF EXISTS (SELECT 1 FROM doctor_profiles WHERE user_id = p_user_id) THEN RETURN 'doctor'; END IF;
  IF EXISTS (SELECT 1 FROM patients WHERE user_id = p_user_id) THEN RETURN 'patient'; END IF;
  SELECT role::TEXT INTO v_role FROM users WHERE id = p_user_id;
  RETURN COALESCE(v_role, 'patient');
END;
$$;

-- ============================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_doctors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE remind_me           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes          ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
-- Insert is server-side only (service role bypasses RLS)

-- ── patients ─────────────────────────────────────────────────
CREATE POLICY "patients_read_own" ON patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "patients_update_own" ON patients FOR UPDATE USING (user_id = auth.uid());

-- ── admins ───────────────────────────────────────────────────
CREATE POLICY "admins_read_own" ON admins FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admins_update_own" ON admins FOR UPDATE USING (user_id = auth.uid());

-- ── doctor_profiles (public read for SEO) ────────────────────
CREATE POLICY "dp_public_read" ON doctor_profiles FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "dp_owner_all" ON doctor_profiles FOR ALL USING (user_id = auth.uid());

-- ── doctor_availability ──────────────────────────────────────
CREATE POLICY "avail_public_read" ON doctor_availability FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "avail_doctor_write" ON doctor_availability FOR ALL
  USING (doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));

-- ── consultations ────────────────────────────────────────────
CREATE POLICY "consult_read_own" ON consultations FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "consult_patient_insert" ON consultations FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "consult_update_own" ON consultations FOR UPDATE
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));

-- ── consultation_queue ───────────────────────────────────────
CREATE POLICY "queue_read" ON consultation_queue FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "queue_patient_insert" ON consultation_queue FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "queue_patient_delete" ON consultation_queue FOR DELETE USING (patient_id = auth.uid());
CREATE POLICY "queue_doctor_update" ON consultation_queue FOR UPDATE
  USING (doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));

-- ── conversations ──────────────────────────────────────────────
CREATE POLICY "conv_admin_all" ON conversations FOR ALL 
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
CREATE POLICY "conv_doctor_read" ON conversations FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "conv_patient_read" ON conversations FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "conv_users_insert" ON conversations FOR INSERT
  WITH CHECK (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "conv_users_update" ON conversations FOR UPDATE
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));

-- ── messages ─────────────────────────────────────────────────
CREATE POLICY "msg_read" ON messages FOR SELECT
  USING (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "msg_send" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND (patient_id = auth.uid() OR doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid())));

-- ── saved_doctors ────────────────────────────────────────────
CREATE POLICY "sd_own" ON saved_doctors FOR ALL USING (patient_id = auth.uid());

-- ── remind_me ────────────────────────────────────────────────
CREATE POLICY "rm_own" ON remind_me FOR ALL USING (patient_id = auth.uid());

-- ── notifications ────────────────────────────────────────────
CREATE POLICY "notif_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- ── reviews ──────────────────────────────────────────────────
CREATE POLICY "rev_public_read" ON reviews FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "rev_patient_insert" ON reviews FOR INSERT WITH CHECK (patient_id = auth.uid());

-- ── blog_categories ──────────────────────────────────────────
CREATE POLICY "cat_public_read" ON blog_categories FOR SELECT TO anon, authenticated USING (true);

-- ── blog_posts ───────────────────────────────────────────────
CREATE POLICY "bp_public_read" ON blog_posts FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "bp_doctor_write" ON blog_posts FOR ALL
  USING (doctor_id IN (SELECT id FROM doctor_profiles WHERE user_id = auth.uid()));

-- ── blog_comments ────────────────────────────────────────────
CREATE POLICY "bc_public_read" ON blog_comments FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "bc_auth_insert" ON blog_comments FOR INSERT WITH CHECK (author_id = auth.uid());

-- ── blog_likes ───────────────────────────────────────────────
CREATE POLICY "bl_public_read" ON blog_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "bl_auth_insert" ON blog_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bl_own_delete" ON blog_likes FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- PART 7: SUPABASE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE blog_likes;

-- ============================================================
-- PART 8: SEED DATA (Minimal — only categories + admin)
-- ============================================================

-- ── Blog Categories ──────────────────────────────────────────
INSERT INTO blog_categories (id, name, slug, description) VALUES
  ('bc000001-0000-0000-0000-000000000001', 'Cardiology',     'cardiology',     'Heart health and cardiovascular care'),
  ('bc000001-0000-0000-0000-000000000002', 'General Health',  'general-health', 'Everyday wellness and preventive care'),
  ('bc000001-0000-0000-0000-000000000003', 'Mental Health',   'mental-health',  'Psychology, wellbeing, and psychiatry'),
  ('bc000001-0000-0000-0000-000000000004', 'Dermatology',     'dermatology',    'Skin health and cosmetic treatments'),
  ('bc000001-0000-0000-0000-000000000005', 'Neurology',       'neurology',      'Brain, spine, and nervous system'),
  ('bc000001-0000-0000-0000-000000000006', 'Pediatrics',      'pediatrics',     'Child health and development')
ON CONFLICT DO NOTHING;

-- ── Admin Account (for managing the system) ──────────────────
-- Create a system admin in auth.users
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, role, aud
) VALUES
('00000000-0000-0000-0000-000000000099', 'admin@novahealth.test', crypt('password123', gen_salt('bf')), now(),
  '{"name": "System Admin", "role": "admin"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Create matching public.users row for admin
INSERT INTO users (id, email, name, role, avatar_url) VALUES
('00000000-0000-0000-0000-000000000099', 'admin@novahealth.test', 'System Admin', 'admin',
  'https://ui-avatars.com/api/?name=System+Admin&background=334155&color=fff&size=128')
ON CONFLICT (id) DO NOTHING;

-- Create admin profile
INSERT INTO admins (user_id, department, permissions, is_super_admin) VALUES
('00000000-0000-0000-0000-000000000099', 'Platform Operations', ARRAY['all'], true)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- DONE! Database is ready.
-- ============================================================
-- The system starts clean with no seed doctors or patients.
-- Register doctors through /doctor-login and patients through /login.
-- Admin credentials: admin@novahealth.test / password123
-- ============================================================

