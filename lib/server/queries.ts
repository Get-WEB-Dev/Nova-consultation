/**
 * Nova Health Consultancy — Server Data Layer
 *
 * Used exclusively in:
 *   /app/api/* routes
 *   Next.js Server Components (no 'use client')
 *
 * Uses the admin client (service role) to bypass RLS for all
 * write operations. This is the standard pattern for server-side
 * API routes in Next.js + Supabase.
 */

import { createAdminClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type DoctorRow = Database['public']['Tables']['doctor_profiles']['Row'];
type ConsultRow = Database['public']['Tables']['consultations']['Row'];
type QueueRow = Database['public']['Tables']['consultation_queue']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type BlogPostRow = Database['public']['Tables']['blog_posts']['Row'];
type NotifRow = Database['public']['Tables']['notifications']['Row'];
type ReviewRow = Database['public']['Tables']['reviews']['Row'];

// ── Types with joined user name ───────────────────────────────
export type DoctorWithName = DoctorRow & { users: { name: string; avatar_url: string | null } };

// ============================================================
// DOCTORS — public, SEO-safe (no auth required)
// ============================================================

/**
 * Returns all published doctor profiles with their user name.
 * Used by /api/doctors (public) and the doctors listing page.
 */
export async function fetchDoctors(): Promise<DoctorWithName[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('doctor_profiles')
    .select('*, users(name, avatar_url)')
    .eq('is_published', true)
    .order('status', { ascending: true });  // available first
  if (error) throw error;
  return (data ?? []) as DoctorWithName[];
}

/**
 * Fetch a single doctor by UUID or slug for the profile page.
 */
export async function fetchDoctorByIdOrSlug(
  idOrSlug: string
): Promise<DoctorWithName | null> {
  const admin = createAdminClient();
  const isUuid = /^[0-9a-f-]{36}$/.test(idOrSlug);
  const filter = isUuid ? { id: idOrSlug } : { slug: idOrSlug };

  const { data, error } = await admin
    .from('doctor_profiles')
    .select('*, users(name, avatar_url)')
    .match(filter)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DoctorWithName) ?? null;
}

// ============================================================
// CONSULTATIONS — use admin client for all operations
// ============================================================

/**
 * Fetch all consultations for a patient.
 */
export async function fetchConsultationsByPatient(
  patientId: string
): Promise<ConsultRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('consultations')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a single consultation by ID.
 */
export async function fetchConsultationById(
  consultationId: string
): Promise<ConsultRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Create a new consultation session.
 * Returns the created row with the auto-generated video_room_name.
 */
export async function createConsultation(params: {
  doctorId: string;
  patientId: string;
  isFollowUp: boolean;
  followUpScheduledAt?: string;
}): Promise<ConsultRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('consultations')
    .insert({
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      is_follow_up: params.isFollowUp,
      follow_up_scheduled_at: params.followUpScheduledAt ?? null,
      status: 'waiting',
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// QUEUE
// ============================================================

/**
 * Get the live queue for a doctor.
 */
export async function fetchQueue(doctorId: string): Promise<QueueRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('consultation_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('status', 'waiting')
    .order('queue_position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Get a patient's own queue entry for a doctor.
 */
export async function fetchPatientQueueEntry(
  doctorId: string,
  patientId: string
): Promise<QueueRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('consultation_queue')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .eq('status', 'waiting')
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Join the queue for a doctor.
 * Inserts a new entry; position is calculated by the DB trigger.
 */
export async function joinQueue(
  doctorId: string,
  patientId: string,
  consultationId?: string
): Promise<QueueRow> {
  const admin = createAdminClient();

  // Determine next position
  const { count } = await admin
    .from('consultation_queue')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_id', doctorId)
    .eq('status', 'waiting');

  const position = (count ?? 0) + 1;

  const { data: dpRow } = await admin
    .from('doctor_profiles')
    .select('consultation_duration_mins')
    .eq('id', doctorId)
    .single();

  const estimatedWait = (position - 1) * ((dpRow as any)?.consultation_duration_mins ?? 15);

  const { data, error } = await admin
    .from('consultation_queue')
    .insert({
      doctor_id: doctorId,
      patient_id: patientId,
      consultation_id: consultationId ?? null,
      queue_position: position,
      estimated_wait_mins: estimatedWait,
      status: 'waiting',
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Leave the queue (patient cancels).
 */
export async function leaveQueue(
  doctorId: string,
  patientId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('consultation_queue')
    .delete()
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .eq('status', 'waiting');
  if (error) throw error;
}

// ============================================================
// MESSAGES
// ============================================================

/**
 * Fetch message history for a consultation (paginated).
 */
export async function fetchMessages(
  consultationId: string,
  limit = 50,
  before?: string
): Promise<MessageRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from('messages')
    .select('*')
    .eq('consultation_id', consultationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Send a text message.
 */
export async function sendMessage(params: {
  consultationId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  body: string;
}): Promise<MessageRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('messages')
    .insert({
      consultation_id: params.consultationId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      body: params.body,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Send a message with an attachment (after uploading via storage).
 */
export async function sendAttachmentMessage(params: {
  consultationId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  attachmentUrl: string;
  attachmentName: string;
  attachmentType: 'image' | 'pdf' | 'document' | 'other';
  attachmentSize: number;
}): Promise<MessageRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('messages')
    .insert({
      consultation_id: params.consultationId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      body: null,
      attachment_url: params.attachmentUrl,
      attachment_name: params.attachmentName,
      attachment_type: params.attachmentType,
      attachment_size: params.attachmentSize,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================
// SAVED DOCTORS & REMIND ME
// ============================================================

export async function fetchSavedDoctorIds(patientId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('saved_doctors')
    .select('doctor_id')
    .eq('patient_id', patientId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.doctor_id);
}

export async function saveDoctor(patientId: string, doctorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('saved_doctors')
    .upsert(
      { patient_id: patientId, doctor_id: doctorId },
      { onConflict: 'patient_id,doctor_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function unsaveDoctor(patientId: string, doctorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('saved_doctors')
    .delete()
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId);
  if (error) throw error;
}

export async function setRemindMe(patientId: string, doctorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('remind_me')
    .upsert(
      { patient_id: patientId, doctor_id: doctorId, notified: false },
      { onConflict: 'patient_id,doctor_id', ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function clearRemindMe(patientId: string, doctorId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('remind_me')
    .delete()
    .eq('patient_id', patientId)
    .eq('doctor_id', doctorId);
  if (error) throw error;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function fetchNotifications(userId: string): Promise<NotifRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(notifId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true } as any)
    .eq('id', notifId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('notifications')
    .update({ read: true } as any)
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

// ============================================================
// BLOG POSTS — public, SEO-safe
// ============================================================

export async function fetchBlogPosts(params?: {
  limit?: number;
  categorySlug?: string;
  tag?: string;
  doctorId?: string;
}): Promise<BlogPostRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from('blog_posts')
    .select('*, users(name, avatar_url), doctor_profiles(specialty)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(params?.limit ?? 20);

  if (params?.doctorId) query = query.eq('doctor_id', params.doctorId);
  if (params?.tag) query = query.contains('tags', [params.tag]);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPostRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blog_posts')
    .select('*, users(name, avatar_url), doctor_profiles(specialty)')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// ============================================================
// REVIEWS (public read)
// ============================================================

export async function fetchDoctorReviews(doctorId: string): Promise<ReviewRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('reviews')
    .select('*, users!patient_id(name)')
    .eq('doctor_id', doctorId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  // Flatten joined patient name
  return (data ?? []).map((r: any) => ({
    ...r,
    patient_name: r.users?.name ?? null,
  }));
}

export async function submitReview(params: {
  consultationId: string;
  doctorId: string;
  patientId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('reviews')
    .insert({
      consultation_id: params.consultationId,
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      rating: params.rating,
      comment: params.comment ?? null,
    } as any);
  if (error) throw error;
}
