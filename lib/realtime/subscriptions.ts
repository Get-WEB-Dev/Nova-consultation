/**
 * Nova Health Consultancy — Realtime Subscriptions
 *
 * Each exported function returns an unsubscribe callback.
 * Call it in useEffect cleanup to prevent memory leaks.
 *
 * Tables subscribed:
 *   consultation_queue   → queue position updates
 *   messages             → live chat
 *   doctor_profiles      → status changes
 *   notifications        → live bell icon
 *   consultations        → session status changes
 */

import { supabase } from '../supabase/client';
import type {
  Database,
  DoctorStatusDB,
  QueueStatusDB,
  ConsultStatus,
  MessageSender,
} from '../supabase/database.types';

type QueueRow = Database['public']['Tables']['consultation_queue']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type DoctorRow = Database['public']['Tables']['doctor_profiles']['Row'];
type NotifRow = Database['public']['Tables']['notifications']['Row'];
type ConsultRow = Database['public']['Tables']['consultations']['Row'];

// ── 1. Queue position for a specific patient + doctor ─────────
/**
 * Subscribe to queue changes for a given doctor.
 * Fires on any INSERT / UPDATE / DELETE affecting the doctor's queue.
 *
 * Usage:
 *   const unsub = subscribeToQueue('doctor-uuid', (rows) => setQueue(rows));
 *   return unsub; // inside useEffect cleanup
 */
export function subscribeToQueue(
  doctorId: string,
  onUpdate: (rows: QueueRow[]) => void
): () => void {
  const channel = supabase
    .channel(`queue:${doctorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'consultation_queue',
        filter: `doctor_id=eq.${doctorId}`,
      },
      async () => {
        // Re-fetch the full ordered queue on any change
        const { data } = await supabase
          .from('consultation_queue')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('status', 'waiting')
          .order('queue_position', { ascending: true });
        onUpdate(data ?? []);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 2. Patient's own queue position ───────────────────────────
/**
 * Subscribe to a single patient's queue entry for a doctor.
 * Useful for showing "Your position: #2 — Est. 8 min".
 */
export function subscribeToPatientQueuePosition(
  doctorId: string,
  patientId: string,
  onUpdate: (entry: QueueRow | null) => void
): () => void {
  const channel = supabase
    .channel(`queue-patient:${patientId}:${doctorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'consultation_queue',
        filter: `patient_id=eq.${patientId}`,
      },
      async () => {
        const { data } = await supabase
          .from('consultation_queue')
          .select('*')
          .eq('doctor_id', doctorId)
          .eq('patient_id', patientId)
          .eq('status', 'waiting')
          .maybeSingle();
        onUpdate(data ?? null);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 3. Live chat messages for a consultation ──────────────────
/**
 * Subscribe to all new messages in a consultation room.
 * Fires on INSERT only (messages are never updated).
 */
export function subscribeToMessages(
  consultationId: string,
  onNewMessage: (message: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`messages:${consultationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `consultation_id=eq.${consultationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as MessageRow);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 4. Doctor availability status changes ─────────────────────
/**
 * Subscribe to a single doctor's status changes.
 * Drives the live status badge on the doctor card / profile.
 */
export function subscribeToDoctorStatus(
  doctorId: string,
  onStatusChange: (status: DoctorStatusDB) => void
): () => void {
  const channel = supabase
    .channel(`doctor-status:${doctorId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'doctor_profiles',
        filter: `id=eq.${doctorId}`,
      },
      (payload) => {
        const updated = payload.new as DoctorRow;
        onStatusChange(updated.status);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 5. All published doctor statuses (for listing page) ────────
/**
 * Subscribe to any doctor status change on the doctors listing.
 * Fires on any doctor UPDATE — use sparingly, filter client-side.
 */
export function subscribeToAllDoctorStatuses(
  onStatusChange: (doctorId: string, status: DoctorStatusDB) => void
): () => void {
  const channel = supabase
    .channel('all-doctor-statuses')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'doctor_profiles',
      },
      (payload) => {
        const updated = payload.new as DoctorRow;
        if (payload.old && (payload.old as DoctorRow).status !== updated.status) {
          onStatusChange(updated.id, updated.status);
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 6. Consultation session status updates ────────────────────
/**
 * Subscribe to status changes on a specific consultation.
 * Useful in the meeting room to detect when doctor ends the session.
 */
export function subscribeToConsultationStatus(
  consultationId: string,
  onStatusChange: (status: ConsultStatus) => void
): () => void {
  const channel = supabase
    .channel(`consultation:${consultationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'consultations',
        filter: `id=eq.${consultationId}`,
      },
      (payload) => {
        const updated = payload.new as ConsultRow;
        onStatusChange(updated.status);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── 7. User notification feed ────────────────────────────────
/**
 * Subscribe to new notifications for a user.
 * Drives the live bell icon badge count.
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notif: NotifRow) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new as NotifRow);
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
