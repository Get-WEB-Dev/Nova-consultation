-- ============================================================
-- NOVA HEALTH CONSULTANCY — Schema Improvements
-- Migration: 004_schema_improvements.sql
-- ============================================================
-- Adds intake fields to consultations, blog_likes table,
-- and seed data for blog comments.
-- ============================================================

-- ── Add intake fields to consultations ───────────────────────
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS duration_description TEXT;

COMMENT ON COLUMN consultations.symptoms IS 'Patient-reported symptoms submitted during intake';
COMMENT ON COLUMN consultations.duration_description IS 'How long symptoms have persisted, e.g. "3 days", "1 week"';

-- ── Blog Likes (per-user tracking) ───────────────────────────
CREATE TABLE IF NOT EXISTS blog_likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user ON blog_likes(user_id);

COMMENT ON TABLE blog_likes IS 'Per-user like tracking for blog posts. The blog_posts.likes counter is kept in sync via application logic.';

-- ── RLS for blog_likes ───────────────────────────────────────
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_likes_public_read"
  ON blog_likes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "blog_likes_authenticated_insert"
  ON blog_likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "blog_likes_own_delete"
  ON blog_likes FOR DELETE
  USING (user_id = auth.uid());

-- ── Seed blog comments ───────────────────────────────────────
INSERT INTO blog_comments (post_id, author_id, body) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'This is really helpful! I had no idea about these signs. Thank you Dr. Sarah!'
),
(
  'b0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'My father has some of these symptoms. We will schedule a consultation right away.'
),
(
  'b0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Very informative article. I always wondered what those numbers meant!'
),
(
  'b0000001-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Great reminder about sunscreen! I always forget to reapply.'
),
(
  'b0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'I have been suffering from migraines for years. This article gave me new strategies to try.'
),
(
  'b0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'The headache diary tip is genius. Starting mine today!'
)
ON CONFLICT DO NOTHING;

-- ── Update blog_posts comment counts to match actual comments ──
UPDATE blog_posts SET comment_count = (
  SELECT COUNT(*) FROM blog_comments WHERE post_id = blog_posts.id AND is_approved = true
);

-- ── Seed blog likes ──────────────────────────────────────────
INSERT INTO blog_likes (post_id, user_id) VALUES
('b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
('b0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
('b0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
('b0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (post_id, user_id) DO NOTHING;

-- ── Update consultation seed data with intake info ───────────
UPDATE consultations SET
  symptoms = 'Chest tightness, elevated blood pressure readings at home',
  duration_description = '2 weeks'
WHERE id = 'c5000001-0000-0000-0000-000000000001';

UPDATE consultations SET
  symptoms = 'Recurring severe headaches with light sensitivity',
  duration_description = '1 month'
WHERE id = 'c5000001-0000-0000-0000-000000000003';

UPDATE consultations SET
  symptoms = 'General fatigue, routine checkup',
  duration_description = 'Ongoing'
WHERE id = 'c5000001-0000-0000-0000-000000000004';

-- ── Additional notification types ────────────────────────────
INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'chat',
  'New message from Dr. Sarah Johnson',
  'Dr. Sarah Johnson sent you a message regarding your consultation.',
  'Dr. Sarah Johnson',
  '/appointments'
),
(
  '00000000-0000-0000-0000-000000000002',
  'consultation_complete',
  'Consultation summary ready',
  'Your consultation with Dr. Abebe Girma is complete. View your summary and notes.',
  'Dr. Abebe Girma',
  '/appointments'
),
(
  '00000000-0000-0000-0000-000000000010',
  'system',
  'New patient in queue',
  'Abebe Tesfaye has joined your consultation queue.',
  NULL,
  '/doctor-dashboard'
),
(
  '00000000-0000-0000-0000-000000000010',
  'system',
  'New review received',
  'A patient has left a 5-star review on your profile.',
  NULL,
  '/doctor-dashboard'
)
ON CONFLICT DO NOTHING;

-- ── Realtime for blog_likes ──────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE blog_likes;
