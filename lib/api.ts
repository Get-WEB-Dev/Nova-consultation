/**
 * Nova Health Consultancy — Client-Side Data Access Layer
 *
 * All data is fetched from real API routes backed by Supabase.
 * No mock fallbacks — the app requires a live Supabase project.
 *
 * ── MOCK DATA (disabled) ─────────────────────────────────────
 * To re-enable mock data for testing without a backend:
 *   1. Rename data/*.mock.json → data/*.json
 *   2. Uncomment the import lines below
 *   3. Uncomment the fallback return statements in each function
 * ─────────────────────────────────────────────────────────────
 *
 * // import doctorsData       from '@/data/doctors.mock.json';
 * // import postsData         from '@/data/posts.mock.json';
 * // import consultationsData from '@/data/consultations.mock.json';
 */

import type { Doctor, Post, ConsultationSession, Notification } from './types';

export type { Doctor, Post, ConsultationSession, Notification };

// ─── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(): Promise<Doctor[]> {
  try {
    const res = await fetch('/api/doctors', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
  // Mock fallback:
  // return doctorsData as Doctor[];
}

export async function getDoctorById(id: string): Promise<Doctor | null> {
  try {
    const res = await fetch(`/api/doctors/${id}`, { next: { revalidate: 60 } });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch { return null; }
  // Mock fallback:
  // return (doctorsData as Doctor[]).find((d) => d.id === id) ?? null;
}

export async function getAvailableDoctors(): Promise<Doctor[]> {
  try {
    const res = await fetch('/api/doctors?status=available', { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
  // Mock fallback:
  // return (doctorsData as Doctor[]).filter((d) => d.status === 'available');
}

// ─── Consultation Sessions ────────────────────────────────────────────────────

export async function getConsultations(patientId?: string): Promise<ConsultationSession[]> {
  if (!patientId) return [];
  try {
    const res = await fetch(`/api/consultations?patientId=${patientId}`);
    if (!res.ok) return [];
    const json = await res.json();
    // API returns a raw array
    return Array.isArray(json) ? json : (json.data ?? []);
  } catch { return []; }
  // Mock fallback:
  // return consultationsData as ConsultationSession[];
}

export async function getConsultationById(id: string): Promise<ConsultationSession | null> {
  const sessions = await getConsultations();
  return sessions.find((c) => c.id === id) ?? null;
  // Mock fallback:
  // return (consultationsData as ConsultationSession[]).find((c) => c.id === id) ?? null;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch('/api/posts', { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
  // Mock fallback:
  // return postsData as Post[];
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const res = await fetch(`/api/posts/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
  // Mock fallback:
  // return (postsData as Post[]).find((p) => p.id === id) ?? null;
}

export async function getPostsByDoctor(doctorId: string): Promise<Post[]> {
  const res = await fetch(`/api/posts?doctorId=${doctorId}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
  // Mock fallback:
  // return (postsData as Post[]).filter((p) => p.doctorId === doctorId);
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export async function joinQueue(doctorId: string, patientId: string, consultationId?: string) {
  const res = await fetch('/api/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, patientId, consultationId }),
  });
  if (!res.ok) throw new Error('Failed to join queue');
  return res.json();
}

export async function leaveQueue(doctorId: string, patientId: string) {
  await fetch('/api/queue', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctorId, patientId }),
  });
  return { success: true };
}

// ─── Saved Doctors ────────────────────────────────────────────────────────────

export async function getSavedDoctors(patientId: string): Promise<string[]> {
  if (!patientId) return [];
  try {
    const res = await fetch(`/api/saved-doctors?patientId=${patientId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
  // Mock fallback (localStorage):
  // if (typeof window !== 'undefined') {
  //   return JSON.parse(localStorage.getItem('nova-saved-doctors') || '[]');
  // }
  // return [];
}

export async function saveDoctor(patientId: string, doctorId: string): Promise<void> {
  if (!patientId || !doctorId) return;
  try {
    await fetch('/api/saved-doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, doctorId }),
    });
  } catch { /* silently ignore — UI already updated optimistically */ }
}

export async function unsaveDoctor(patientId: string, doctorId: string): Promise<void> {
  if (!patientId || !doctorId) return;
  try {
    await fetch('/api/saved-doctors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, doctorId }),
    });
  } catch { /* silently ignore */ }
}

// ─── Remind Me ────────────────────────────────────────────────────────────────

// NOTE: params are (patientId, doctorId) to match the API route body schema.
// Both callers in doctor/[id]/page.tsx pass (params.id, user.id) — fixed below in that page.
export async function setRemindMe(patientId: string, doctorId: string) {
  try {
    const res = await fetch('/api/remind-me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, doctorId }),
    });
    if (!res.ok) throw new Error('Failed to set reminder');
    return res.json();
  } catch { /* silently ignore — UI already updated optimistically */ }
}

export async function clearRemindMe(patientId: string, doctorId: string) {
  try {
    await fetch('/api/remind-me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, doctorId }),
    });
  } catch { /* silently ignore */ }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(userId?: string): Promise<Notification[]> {
  if (!userId) return [];
  const res = await fetch(`/api/notifications?userId=${userId}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifId }),
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, markAll: true }),
  });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const res = await fetch(`/api/profile?userId=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(userId: string, data: {
  name?: string;
  phone?: string;
  dob?: string;
  bio?: string;
  bloodType?: string;
  allergies?: string;
  emergencyContact?: string;
}) {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, ...data }),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getDoctorReviews(doctorId: string) {
  const res = await fetch(`/api/reviews?doctorId=${doctorId}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}
