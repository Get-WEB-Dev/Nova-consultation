-- ============================================================
-- NOVA HEALTH CONSULTANCY — SUPABASE DATABASE SCHEMA
-- On-Demand Consultation Model
-- Migration: 001_schema.sql
-- ============================================================
-- Run in Supabase SQL Editor > New Query
-- Enable extensions first, then run this file in full.
-- ============================================================

-- ── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
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
-- TABLE: users
-- Extends Supabase auth.users. One row per registered user.
-- ============================================================
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

COMMENT ON TABLE users IS 'Patient and professional profiles linked to auth.users';

-- ============================================================
-- TABLE: doctor_profiles
-- Extended profile for doctors only. 1:1 with users where role=doctor.
-- ============================================================
CREATE TABLE doctor_profiles (
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty                    TEXT          NOT NULL,
  hospital                     TEXT,
  experience_years             INT           NOT NULL DEFAULT 0,
  rating                       NUMERIC(3,2)  NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count                 INT           NOT NULL DEFAULT 0,
  fee                          NUMERIC(10,2) NOT NULL DEFAULT 0,
  languages                    TEXT[]        NOT NULL DEFAULT '{}',
  tags                         TEXT[]        NOT NULL DEFAULT '{}',
  gender                       gender_type,
  patients_served              INT           NOT NULL DEFAULT 0,
  consultation_type            consultation_type NOT NULL DEFAULT 'video',
  status                       doctor_status NOT NULL DEFAULT 'offline',
  location_city                TEXT,
  consultation_duration_mins   INT           NOT NULL DEFAULT 15,
  next_available_slot          TEXT,
  -- Video session: livekit room prefix or similar provider token seed
  video_provider_identity      TEXT,
  -- SEO / public profile
  slug                         TEXT          UNIQUE,
  is_verified                  BOOLEAN       NOT NULL DEFAULT false,
  is_published                 BOOLEAN       NOT NULL DEFAULT false,
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctor_profiles_user_id  ON doctor_profiles(user_id);
CREATE INDEX idx_doctor_profiles_status   ON doctor_profiles(status);
CREATE INDEX idx_doctor_profiles_specialty ON doctor_profiles(specialty);
CREATE INDEX idx_doctor_profiles_slug     ON doctor_profiles(slug);

COMMENT ON TABLE doctor_profiles IS 'Extended doctor information, 1:1 with users(role=doctor)';
COMMENT ON COLUMN doctor_profiles.video_provider_identity IS 'Stable identity used to generate LiveKit or WebRTC tokens per doctor';
COMMENT ON COLUMN doctor_profiles.slug IS 'URL-safe identifier for SEO: /doctor/[slug]';

-- ============================================================
-- TABLE: doctor_availability
-- Weekly schedule blocks per doctor. Used for follow-up slots.
-- ============================================================
CREATE TABLE doctor_availability (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  -- 0=Sunday … 6=Saturday
  day_of_week INT         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

COMMENT ON TABLE doctor_availability IS 'Weekly repeating schedule blocks used for follow-up session scheduling';

-- ============================================================
-- TABLE: consultations
-- Core table — one row per consultation session.
-- Covers: instant, queued, and doctor-scheduled follow-ups.
-- ============================================================
CREATE TABLE consultations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID          NOT NULL REFERENCES doctor_profiles(id),
  patient_id            UUID          NOT NULL REFERENCES users(id),
  status                consult_status NOT NULL DEFAULT 'waiting',
  is_follow_up          BOOLEAN       NOT NULL DEFAULT false,
  follow_up_scheduled_at TIMESTAMPTZ,
  -- Timing
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  duration_minutes      INT,
  -- Doctor notes & summary (written after session)
  notes                 TEXT,
  summary               TEXT,
  -- Video: unique room name per session for LiveKit / WebRTC
  video_room_name       TEXT          UNIQUE,
  video_session_token   TEXT,
  -- Rating (0 = not rated)
  patient_rating        INT           CHECK (patient_rating BETWEEN 1 AND 5),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_doctor    ON consultations(doctor_id);
CREATE INDEX idx_consultations_patient   ON consultations(patient_id);
CREATE INDEX idx_consultations_status    ON consultations(status);
CREATE INDEX idx_consultations_follow_up ON consultations(is_follow_up, follow_up_scheduled_at)
  WHERE is_follow_up = true;
CREATE INDEX idx_consultations_active    ON consultations(doctor_id, status)
  WHERE status IN ('active', 'waiting');

COMMENT ON TABLE consultations IS 'One row per consultation (instant, queued, or follow-up). Each has a unique video room.';
COMMENT ON COLUMN consultations.video_room_name IS 'Unique room name used to create/join LiveKit room: nova-{consultation-uuid}';
COMMENT ON COLUMN consultations.video_session_token IS 'Short-lived JWT from video provider, refreshed on join';

-- ============================================================
-- TABLE: consultation_queue
-- Active queue per doctor. Realtime-subscribed by patients.
-- ============================================================
CREATE TABLE consultation_queue (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  patient_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_id       UUID        REFERENCES consultations(id),
  queue_position        INT         NOT NULL,
  estimated_wait_mins   INT         NOT NULL DEFAULT 0,
  status                queue_status NOT NULL DEFAULT 'waiting',
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at             TIMESTAMPTZ,
  UNIQUE (doctor_id, patient_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_queue_doctor  ON consultation_queue(doctor_id, status);
CREATE INDEX idx_queue_patient ON consultation_queue(patient_id, status);
CREATE INDEX idx_queue_position ON consultation_queue(doctor_id, queue_position)
  WHERE status = 'waiting';

COMMENT ON TABLE consultation_queue IS 'Per-doctor waiting queue. Realtime subscribed. Position recalculated on join/leave.';

-- ============================================================
-- TABLE: messages
-- In-consultation and pre-consultation chat messages.
-- ============================================================
CREATE TABLE messages (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID          NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id       UUID          NOT NULL REFERENCES users(id),
  sender_role     message_sender NOT NULL,
  body            TEXT,
  -- attachment fields (null if text-only)
  attachment_url  TEXT,
  attachment_name TEXT,
  attachment_type attachment_type,
  attachment_size INT,
  -- for soft-delete / moderation
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_consultation ON messages(consultation_id, created_at);
CREATE INDEX idx_messages_sender       ON messages(sender_id);

COMMENT ON TABLE messages IS 'Chat messages for a consultation. Realtime subscribed. Supports text and file attachments.';

-- ============================================================
-- TABLE: saved_doctors
-- Patients save doctors for quick access and availability alerts.
-- ============================================================
CREATE TABLE saved_doctors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);

CREATE INDEX idx_saved_doctors_patient ON saved_doctors(patient_id);
CREATE INDEX idx_saved_doctors_doctor  ON saved_doctors(doctor_id);

COMMENT ON TABLE saved_doctors IS 'Doctors bookmarked by patients. Triggers availability notifications.';

-- ============================================================
-- TABLE: remind_me
-- Patient requests a notification when an offline doctor comes online.
-- ============================================================
CREATE TABLE remind_me (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id  UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  notified   BOOLEAN     NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);

CREATE INDEX idx_remind_me_doctor    ON remind_me(doctor_id) WHERE notified = false;
CREATE INDEX idx_remind_me_patient   ON remind_me(patient_id);

COMMENT ON TABLE remind_me IS 'One-time reminder: notify patient when offline doctor goes available. Auto-cleared after notification.';

-- ============================================================
-- TABLE: notifications
-- In-app notification feed per user. Realtime-subscribed.
-- ============================================================
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
  -- reference to the source entity (flexible)
  ref_id        UUID,
  ref_table     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_unread  ON notifications(user_id) WHERE read = false;

COMMENT ON TABLE notifications IS 'Per-user notification feed. Realtime subscribed for live bell icon updates.';

-- ============================================================
-- TABLE: reviews
-- Post-consultation patient reviews of doctors.
-- ============================================================
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

CREATE INDEX idx_reviews_doctor  ON reviews(doctor_id, created_at DESC);
CREATE INDEX idx_reviews_patient ON reviews(patient_id);

COMMENT ON TABLE reviews IS 'One review per completed consultation. Rating aggregated back to doctor_profiles.';

-- ============================================================
-- TABLE: blog_categories
-- Category taxonomy for blog posts.
-- ============================================================
CREATE TABLE blog_categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE blog_categories IS 'Taxonomy for blog posts. Publicly readable.';

-- ============================================================
-- TABLE: blog_posts
-- Doctor-authored health articles. Public for SEO.
-- ============================================================
CREATE TABLE blog_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID        NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  category_id     UUID        REFERENCES blog_categories(id),
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  content         TEXT        NOT NULL,
  excerpt         TEXT,
  cover_image     TEXT,
  thumbnail       TEXT,
  video_url       TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  likes           INT         NOT NULL DEFAULT 0,
  comment_count   INT         NOT NULL DEFAULT 0,
  -- SEO
  meta_title      TEXT,
  meta_description TEXT,
  is_published    BOOLEAN     NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_doctor      ON blog_posts(doctor_id);
CREATE INDEX idx_blog_posts_published   ON blog_posts(published_at DESC) WHERE is_published = true;
CREATE INDEX idx_blog_posts_slug        ON blog_posts(slug);
CREATE INDEX idx_blog_posts_category    ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_tags        ON blog_posts USING GIN(tags);

COMMENT ON TABLE blog_posts IS 'Doctor-authored articles. Publicly readable (SEO). Indexed by tag array with GIN.';

-- ============================================================
-- TABLE: blog_comments
-- Reader comments on blog posts.
-- ============================================================
CREATE TABLE blog_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES users(id),
  body       TEXT        NOT NULL,
  is_approved BOOLEAN    NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_comments_post ON blog_comments(post_id, created_at);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- Keep updated_at in sync automatically.
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_doctor_profiles_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FUNCTION: recalculate_queue_positions
-- Called after any insert/delete in consultation_queue
-- to keep queue_position sequential per doctor.
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_queue_positions(p_doctor_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE consultation_queue q
  SET queue_position = sub.new_pos,
      estimated_wait_mins = (sub.new_pos - 1) * (
        SELECT consultation_duration_mins
        FROM doctor_profiles
        WHERE id = p_doctor_id
      )
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY joined_at) AS new_pos
    FROM consultation_queue
    WHERE doctor_id = p_doctor_id AND status = 'waiting'
  ) sub
  WHERE q.id = sub.id;
END;
$$;

-- ============================================================
-- FUNCTION: aggregate_doctor_rating
-- Recalculates doctor rating after a new review is inserted.
-- ============================================================
CREATE OR REPLACE FUNCTION aggregate_doctor_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE doctor_profiles
  SET
    rating = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE doctor_id = NEW.doctor_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE doctor_id = NEW.doctor_id)
  WHERE id = NEW.doctor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aggregate_doctor_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION aggregate_doctor_rating();

-- ============================================================
-- FUNCTION: generate_video_room_name
-- Auto-assigns a unique video room name when a consultation is created.
-- Format: nova-{uuid-short} — plug into LiveKit or similar.
-- ============================================================
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

-- ============================================================
-- FUNCTION: notify_remind_me
-- When a doctor goes from offline→available, fire notifications
-- for all users who requested a reminder and for saved doctors.
-- ============================================================
CREATE OR REPLACE FUNCTION notify_doctor_available()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only fire when status changes to 'available'
  IF OLD.status != 'available' AND NEW.status = 'available' THEN

    -- Notify remind_me users
    INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url, ref_id, ref_table)
    SELECT
      rm.patient_id,
      'doctor_available',
      'Doctor is now available',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id)
        || ' is now available for an instant consultation.',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id),
      '/doctor/' || COALESCE(NEW.slug, NEW.id::TEXT),
      NEW.id,
      'doctor_profiles'
    FROM remind_me rm
    WHERE rm.doctor_id = NEW.id AND rm.notified = false;

    -- Mark reminders as notified
    UPDATE remind_me
    SET notified = true, notified_at = now()
    WHERE doctor_id = NEW.id AND notified = false;

    -- Notify saved-doctor users
    INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url, ref_id, ref_table)
    SELECT
      sd.patient_id,
      'saved_doctor_online',
      'Saved doctor is online',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id)
        || ', a doctor you saved, is now online.',
      (SELECT u.name FROM users u JOIN doctor_profiles dp ON u.id = dp.user_id WHERE dp.id = NEW.id),
      '/doctor/' || COALESCE(NEW.slug, NEW.id::TEXT),
      NEW.id,
      'doctor_profiles'
    FROM saved_doctors sd
    WHERE sd.doctor_id = NEW.id
      -- Don't double-notify if already reminded
      AND sd.patient_id NOT IN (
        SELECT patient_id FROM remind_me
        WHERE doctor_id = NEW.id AND notified = true
          AND notified_at >= now() - INTERVAL '1 minute'
      );

  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_doctor_available
  AFTER UPDATE OF status ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION notify_doctor_available();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_doctors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE remind_me            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments        ENABLE ROW LEVEL SECURITY;

-- ── users ────────────────────────────────────────────────────
CREATE POLICY "users_read_own"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_insert_self"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- ── doctor_profiles (public read for SEO) ────────────────────
CREATE POLICY "doctor_profiles_public_read"
  ON doctor_profiles FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "doctor_profiles_owner_all"
  ON doctor_profiles FOR ALL
  USING (user_id = auth.uid());

-- ── doctor_availability ──────────────────────────────────────
CREATE POLICY "availability_public_read"
  ON doctor_availability FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "availability_doctor_write"
  ON doctor_availability FOR ALL
  USING (
    doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

-- ── consultations ────────────────────────────────────────────
CREATE POLICY "consultations_read_own"
  ON consultations FOR SELECT
  USING (
    patient_id = auth.uid()
    OR doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "consultations_patient_insert"
  ON consultations FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "consultations_update_own"
  ON consultations FOR UPDATE
  USING (
    patient_id = auth.uid()
    OR doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

-- ── consultation_queue ────────────────────────────────────────
CREATE POLICY "queue_read_participant"
  ON consultation_queue FOR SELECT
  USING (
    patient_id = auth.uid()
    OR doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "queue_patient_insert"
  ON consultation_queue FOR INSERT
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "queue_patient_delete"
  ON consultation_queue FOR DELETE
  USING (patient_id = auth.uid());

CREATE POLICY "queue_doctor_update"
  ON consultation_queue FOR UPDATE
  USING (
    doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

-- ── messages ─────────────────────────────────────────────────
CREATE POLICY "messages_read_participant"
  ON messages FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM consultations
      WHERE patient_id = auth.uid()
        OR doctor_id IN (
          SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "messages_send"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND consultation_id IN (
      SELECT id FROM consultations
      WHERE patient_id = auth.uid()
        OR doctor_id IN (
          SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
        )
    )
  );

-- ── saved_doctors ─────────────────────────────────────────────
CREATE POLICY "saved_doctors_own"
  ON saved_doctors FOR ALL
  USING (patient_id = auth.uid());

-- ── remind_me ─────────────────────────────────────────────────
CREATE POLICY "remind_me_own"
  ON remind_me FOR ALL
  USING (patient_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ── reviews ──────────────────────────────────────────────────
CREATE POLICY "reviews_public_read"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "reviews_patient_insert"
  ON reviews FOR INSERT
  WITH CHECK (patient_id = auth.uid());

-- ── blog_categories ───────────────────────────────────────────
CREATE POLICY "blog_categories_public_read"
  ON blog_categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── blog_posts ────────────────────────────────────────────────
CREATE POLICY "blog_posts_public_read"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "blog_posts_doctor_write"
  ON blog_posts FOR ALL
  USING (
    doctor_id IN (
      SELECT id FROM doctor_profiles WHERE user_id = auth.uid()
    )
  );

-- ── blog_comments ─────────────────────────────────────────────
CREATE POLICY "blog_comments_public_read"
  ON blog_comments FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

CREATE POLICY "blog_comments_authenticated_insert"
  ON blog_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ============================================================
-- SUPABASE REALTIME: Enable tables for live subscriptions
-- Run these in Supabase Dashboard > Database > Replication
-- or via CLI: supabase db push
-- ============================================================
-- These tables need Realtime Publication enabled:
--   consultation_queue   → queue position updates
--   messages             → live chat
--   doctor_profiles      → status changes (available/offline)
--   notifications        → bell icon live updates
--   consultations        → session status changes

-- To enable via SQL (Supabase hosted projects):
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE doctor_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
