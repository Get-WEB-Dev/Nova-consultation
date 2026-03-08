-- ============================================================
-- NOVA HEALTH CONSULTANCY — SEED DATA
-- seeds/001_seed.sql
-- ============================================================
-- Run AFTER 001_schema.sql and 003_role_tables.sql
-- Creates test users via auth.users bypass (service role only)
-- For local dev: use `supabase db seed` or paste into SQL editor
-- IDEMPOTENT: safe to re-run (all INSERTs use ON CONFLICT DO NOTHING)
-- ============================================================

-- ── Blog Categories ──────────────────────────────────────────
INSERT INTO blog_categories (id, name, slug, description) VALUES
  ('bc000001-0000-0000-0000-000000000001', 'Cardiology',    'cardiology',    'Heart health and cardiovascular care'),
  ('bc000001-0000-0000-0000-000000000002', 'General Health', 'general-health','Everyday wellness and preventive care'),
  ('bc000001-0000-0000-0000-000000000003', 'Mental Health',  'mental-health', 'Psychology, wellbeing, and psychiatry'),
  ('bc000001-0000-0000-0000-000000000004', 'Dermatology',    'dermatology',   'Skin health and cosmetic treatments'),
  ('bc000001-0000-0000-0000-000000000005', 'Neurology',      'neurology',     'Brain, spine, and nervous system')
ON CONFLICT DO NOTHING;

-- ── Seed auth.users (service role bypass — local dev only) ───
-- In production users sign up via Supabase Auth.
-- The UUIDs below are stable across seeds so FKs work.

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, created_at, updated_at, role, aud
) VALUES
-- Patients
(
  '00000000-0000-0000-0000-000000000001',
  'patient1@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Abebe Tesfaye", "role": "user"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000002',
  'patient2@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Sara Haile", "role": "user"}',
  now(), now(), 'authenticated', 'authenticated'
),
-- Doctors
(
  '00000000-0000-0000-0000-000000000010',
  'dr.sarah@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Sarah Johnson", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000011',
  'dr.abebe@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Abebe Girma", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000012',
  'dr.priya@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Priya Nair", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000013',
  'dr.michael@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Michael Chen", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000014',
  'dr.meron@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Meron Tadesse", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
(
  '00000000-0000-0000-0000-000000000015',
  'dr.yonas@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "Dr. Yonas Bekele", "role": "doctor"}',
  now(), now(), 'authenticated', 'authenticated'
),
-- Admin
(
  '00000000-0000-0000-0000-000000000099',
  'admin@novahealth.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"name": "System Admin", "role": "admin"}',
  now(), now(), 'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ── users (profiles) ─────────────────────────────────────────
INSERT INTO users (id, email, name, role, avatar_url, created_at) VALUES
('00000000-0000-0000-0000-000000000001', 'patient1@novahealth.test', 'Abebe Tesfaye', 'patient',
  'https://ui-avatars.com/api/?name=Abebe+Tesfaye&background=eef4fa&color=1B3A5C&size=128', now()),
('00000000-0000-0000-0000-000000000002', 'patient2@novahealth.test', 'Sara Haile', 'patient',
  'https://ui-avatars.com/api/?name=Sara+Haile&background=fdf7e8&color=E9A825&size=128', now()),
('00000000-0000-0000-0000-000000000010', 'dr.sarah@novahealth.test', 'Dr. Sarah Johnson', 'doctor',
  'https://ui-avatars.com/api/?name=Sarah+Johnson&background=1B3A5C&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000011', 'dr.abebe@novahealth.test', 'Dr. Abebe Girma', 'doctor',
  'https://ui-avatars.com/api/?name=Abebe+Girma&background=0369a1&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000012', 'dr.priya@novahealth.test', 'Dr. Priya Nair', 'doctor',
  'https://ui-avatars.com/api/?name=Priya+Nair&background=0ea5e9&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000013', 'dr.michael@novahealth.test', 'Dr. Michael Chen', 'doctor',
  'https://ui-avatars.com/api/?name=Michael+Chen&background=1d4ed8&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000014', 'dr.meron@novahealth.test', 'Dr. Meron Tadesse', 'doctor',
  'https://ui-avatars.com/api/?name=Meron+Tadesse&background=7c3aed&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000015', 'dr.yonas@novahealth.test', 'Dr. Yonas Bekele', 'doctor',
  'https://ui-avatars.com/api/?name=Yonas+Bekele&background=059669&color=fff&size=128', now()),
('00000000-0000-0000-0000-000000000099', 'admin@novahealth.test', 'System Admin', 'admin',
  'https://ui-avatars.com/api/?name=System+Admin&background=334155&color=fff&size=128', now())
ON CONFLICT (id) DO NOTHING;

-- ── patients (role-specific profiles) ─────────────────────────
INSERT INTO patients (user_id, dob, phone, blood_type, allergies, emergency_contact) VALUES
('00000000-0000-0000-0000-000000000001', '1990-05-15', '+251911234567', 'A+', 'Penicillin', '+251922345678'),
('00000000-0000-0000-0000-000000000002', '1995-08-22', '+251933456789', 'O+', 'None', '+251944567890')
ON CONFLICT (user_id) DO NOTHING;

-- ── admins (role-specific profiles) ───────────────────────────
INSERT INTO admins (user_id, department, permissions, is_super_admin) VALUES
('00000000-0000-0000-0000-000000000099', 'Platform Operations', ARRAY['all'], true)
ON CONFLICT (user_id) DO NOTHING;

-- ── doctor_profiles ──────────────────────────────────────────
INSERT INTO doctor_profiles (
  id, user_id, specialty, hospital, experience_years, rating, review_count,
  fee, languages, tags, gender, patients_served, consultation_type,
  status, location_city, consultation_duration_mins,
  slug, is_verified, is_published, video_provider_identity
) VALUES
(
  'd0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Cardiologist', 'St. Mary''s Medical Center', 12,
  4.9, 238, 120.00, ARRAY['English', 'French'],
  ARRAY['Heart Disease', 'Hypertension', 'ECG', 'Echo'],
  'female', 2840, 'both', 'available', 'Addis Ababa', 15,
  'sarah-johnson', true, true, 'dr-sarah-johnson'
),
(
  'd0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000011',
  'General Practitioner', 'Tikur Anbessa Hospital', 8,
  4.7, 184, 80.00, ARRAY['English', 'Amharic'],
  ARRAY['General Care', 'Diabetes', 'Preventive', 'Family Health'],
  'male', 3200, 'both', 'busy', 'Addis Ababa', 15,
  'abebe-girma', true, true, 'dr-abebe-girma'
),
(
  'd0000001-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000012',
  'Dermatologist', 'Aster Clinic', 9,
  4.8, 156, 100.00, ARRAY['English', 'Hindi'],
  ARRAY['Acne', 'Eczema', 'Skin Care', 'Cosmetic'],
  'female', 1920, 'video', 'in_consultation', 'Addis Ababa', 10,
  'priya-nair', true, true, 'dr-priya-nair'
),
(
  'd0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000013',
  'Neurologist', 'Black Lion Hospital', 15,
  4.9, 312, 150.00, ARRAY['English', 'Mandarin'],
  ARRAY['Migraines', 'Epilepsy', 'Neurology', 'Cognitive'],
  'male', 4100, 'video', 'offline', 'Addis Ababa', 20,
  'michael-chen', true, true, 'dr-michael-chen'
),
(
  'd0000001-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000014',
  'Pediatrician', 'Children''s Hospital', 7,
  4.8, 203, 90.00, ARRAY['English', 'Amharic'],
  ARRAY['Child Care', 'Vaccines', 'Development', 'Nutrition'],
  'female', 2100, 'both', 'available', 'Addis Ababa', 15,
  'meron-tadesse', true, true, 'dr-meron-tadesse'
),
(
  'd0000001-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000015',
  'Psychiatrist', 'Amanuel Hospital', 11,
  4.6, 145, 130.00, ARRAY['English', 'Amharic'],
  ARRAY['Depression', 'Anxiety', 'CBT', 'Mental Health'],
  'male', 980, 'video', 'offline', 'Addis Ababa', 30,
  'yonas-bekele', true, true, 'dr-yonas-bekele'
)
ON CONFLICT (id) DO NOTHING;

-- ── doctor_availability (Mon-Fri blocks) ─────────────────────
INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES
-- Dr. Sarah: Mon-Fri 9-17
('d0000001-0000-0000-0000-000000000001', 1, '09:00', '17:00'),
('d0000001-0000-0000-0000-000000000001', 2, '09:00', '17:00'),
('d0000001-0000-0000-0000-000000000001', 3, '09:00', '17:00'),
('d0000001-0000-0000-0000-000000000001', 4, '09:00', '17:00'),
('d0000001-0000-0000-0000-000000000001', 5, '09:00', '17:00'),
-- Dr. Abebe: Mon-Sat 8-18
('d0000001-0000-0000-0000-000000000002', 1, '08:00', '18:00'),
('d0000001-0000-0000-0000-000000000002', 2, '08:00', '18:00'),
('d0000001-0000-0000-0000-000000000002', 6, '08:00', '13:00'),
-- Dr. Michael: Tue/Thu 10-16
('d0000001-0000-0000-0000-000000000004', 2, '10:00', '16:00'),
('d0000001-0000-0000-0000-000000000004', 4, '10:00', '16:00')
ON CONFLICT DO NOTHING;

-- ── consultations ─────────────────────────────────────────────
INSERT INTO consultations (
  id, doctor_id, patient_id, status,
  is_follow_up, follow_up_scheduled_at,
  started_at, ended_at, duration_minutes,
  notes, summary, video_room_name, patient_rating
) VALUES
-- Completed: patient1 with Dr. Sarah
(
  'c5000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'completed', false, null,
  now() - INTERVAL '15 days',
  now() - INTERVAL '15 days' + INTERVAL '18 minutes',
  18,
  'Cardiology consultation',
  'Reviewed recent ECG results — normal sinus rhythm. Blood pressure slightly elevated at 135/88. Discussed lifestyle modifications including reduced sodium intake and 30 minutes of daily walking. Prescribed low-dose antihypertensive. Follow-up recommended in 3 months.',
  'nova-c50000010000000000000000000000001',
  5
),
-- Follow-up scheduled by Dr. Sarah for patient1
(
  'c5000001-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'follow_up', true, now() + INTERVAL '3 days',
  null, null, null,
  '3-month follow-up after blood pressure consultation. Doctor-assigned private session.',
  null,
  'nova-c50000010000000000000000000000002',
  null
),
-- Completed: patient1 with Dr. Michael
(
  'c5000001-0000-0000-0000-000000000003',
  'd0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'completed', false, null,
  now() - INTERVAL '60 days',
  now() - INTERVAL '60 days' + INTERVAL '22 minutes',
  22,
  'Migraine evaluation',
  'Patient reports recurring migraines 2–3 times per week for past month. Duration 4–6 hours each. Possible triggers: screen time, dehydration, irregular sleep. Recommended magnesium supplement and increased water intake. Prescribed sumatriptan for acute attacks.',
  'nova-c50000010000000000000000000000003',
  5
),
-- Completed: patient2 with Dr. Abebe
(
  'c5000001-0000-0000-0000-000000000004',
  'd0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'completed', false, null,
  now() - INTERVAL '5 days',
  now() - INTERVAL '5 days' + INTERVAL '14 minutes',
  14,
  'General wellness visit',
  'Patient presented for routine general checkup. Blood pressure 120/80 mmHg, normal. Weight stable. No significant findings. Advised to maintain current diet and exercise routine.',
  'nova-c50000010000000000000000000000004',
  4
)
ON CONFLICT (id) DO NOTHING;

-- ── reviews (linked to completed consultations) ───────────────
INSERT INTO reviews (consultation_id, doctor_id, patient_id, rating, comment) VALUES
(
  'c5000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  5, 'Excellent doctor! Very thorough and caring. Explained everything clearly.'
),
(
  'c5000001-0000-0000-0000-000000000003',
  'd0000001-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  5, 'Very professional. Identified my migraine triggers quickly.'
),
(
  'c5000001-0000-0000-0000-000000000004',
  'd0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  4, 'Good doctor. Quick consultation and well-managed.'
)
ON CONFLICT (consultation_id) DO NOTHING;

-- ── consultation_queue (active queue for Dr. Abebe, who is busy) ──
INSERT INTO consultation_queue (
  id, doctor_id, patient_id, queue_position, estimated_wait_mins, status, joined_at
) VALUES
(
  'c0000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  1, 8, 'waiting', now() - INTERVAL '3 minutes'
),
(
  'c0000001-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  2, 16, 'waiting', now() - INTERVAL '1 minute'
)
ON CONFLICT (id) DO NOTHING;

-- ── messages for consultation c5...001 ────────────────────────
INSERT INTO messages (consultation_id, sender_id, sender_role, body) VALUES
(
  'c5000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'doctor',
  'I''ve reviewed your ECG. It looks mostly normal but I''d like to monitor your blood pressure closely.'
),
(
  'c5000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'patient',
  'Should I be worried?'
),
(
  'c5000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'doctor',
  'Not at all. It''s mild and very manageable with lifestyle changes. I''ll send a prescription to your pharmacy.'
)
ON CONFLICT DO NOTHING;

-- ── saved_doctors ─────────────────────────────────────────────
INSERT INTO saved_doctors (patient_id, doctor_id) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001'
),
(
  '00000000-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000004'
),
(
  '00000000-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000002'
)
ON CONFLICT (patient_id, doctor_id) DO NOTHING;

-- ── remind_me ─────────────────────────────────────────────────
INSERT INTO remind_me (patient_id, doctor_id) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000004'  -- Dr. Michael is offline
),
(
  '00000000-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000006'  -- Dr. Yonas is offline
)
ON CONFLICT (patient_id, doctor_id) DO NOTHING;

-- ── blog_posts ────────────────────────────────────────────────
INSERT INTO blog_posts (
  id, doctor_id, category_id, title, slug, content, excerpt, tags,
  likes, comment_count, is_published, published_at
) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  'd0000001-0000-0000-0000-000000000001',
  'bc000001-0000-0000-0000-000000000001',
  '5 Early Signs of Heart Disease You Should Not Ignore',
  '5-early-signs-of-heart-disease',
  'Cardiovascular disease remains the leading cause of death worldwide. Early detection is critical. Here are five warning signs that warrant immediate medical attention: chest discomfort, shortness of breath, irregular heartbeat, swollen ankles, and persistent fatigue. If you experience any of these, schedule a consultation today.',
  'Cardiovascular disease is the leading cause of death worldwide. Learn the five warning signs you should never ignore.',
  ARRAY['Heart Disease', 'Prevention', 'Cardiology'],
  142, 18, true, now() - INTERVAL '10 days'
),
(
  'b0000001-0000-0000-0000-000000000002',
  'd0000001-0000-0000-0000-000000000002',
  'bc000001-0000-0000-0000-000000000002',
  'Understanding Blood Pressure: What the Numbers Mean',
  'understanding-blood-pressure',
  'Blood pressure is measured in two numbers: systolic (the pressure when your heart beats) and diastolic (the pressure between beats). A reading of 120/80 mmHg is considered normal. Anything above 130/80 consistently is classified as hypertension. Diet, exercise, and stress management are the first lines of defense.',
  'Learn what your blood pressure numbers mean and when to be concerned.',
  ARRAY['Blood Pressure', 'Hypertension', 'General Health'],
  98, 12, true, now() - INTERVAL '20 days'
),
(
  'b0000001-0000-0000-0000-000000000003',
  'd0000001-0000-0000-0000-000000000003',
  'bc000001-0000-0000-0000-000000000004',
  'The Truth About Sunscreen: How to Protect Your Skin Year-Round',
  'truth-about-sunscreen',
  'Many people only apply sunscreen in summer, but UV radiation reaches your skin year-round — even on cloudy days. SPF 30 blocks about 97% of UVB rays. For best protection, apply 15 minutes before sun exposure and reapply every two hours. Look for broad-spectrum protection covering both UVA and UVB.',
  'UV radiation affects your skin all year. Here is how to choose and use sunscreen correctly.',
  ARRAY['Skin Care', 'Sunscreen', 'Prevention'],
  76, 9, true, now() - INTERVAL '7 days'
),
(
  'b0000001-0000-0000-0000-000000000004',
  'd0000001-0000-0000-0000-000000000004',
  'bc000001-0000-0000-0000-000000000005',
  'Managing Migraines: Triggers, Treatments, and Prevention',
  'managing-migraines',
  'Migraines affect over 1 billion people globally. Common triggers include stress, sleep disruption, dehydration, and certain foods. Keeping a headache diary helps identify personal triggers. Treatment options range from over-the-counter pain relievers to prescription triptans. Preventive strategies include magnesium supplementation, regular sleep schedules, and stress reduction techniques.',
  'Over a billion people suffer from migraines. Understanding your triggers is the first step to prevention.',
  ARRAY['Migraines', 'Neurology', 'Headaches'],
  203, 31, true, now() - INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;

-- ── notifications for patient1 ─────────────────────────────────
INSERT INTO notifications (user_id, type, title, message, doctor_name, action_url) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'follow_up',
  'Follow-up session scheduled',
  'Dr. Sarah Johnson has scheduled a follow-up consultation for you.',
  'Dr. Sarah Johnson',
  '/appointments'
),
(
  '00000000-0000-0000-0000-000000000001',
  'consultation_complete',
  'Consultation summary ready',
  'Your consultation with Dr. Michael Chen is complete. View your notes.',
  'Dr. Michael Chen',
  '/appointments'
)
ON CONFLICT DO NOTHING;
