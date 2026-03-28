/**
 * Nova Health Consultancy — Realtime Subscriptions
 *
 * Each exported function returns an unsubscribe callback.
 * Call it in useEffect cleanup to prevent memory leaks.
 *
 * Tables subscribed:
 *   consultation_queue   → queue position updates
 *   messages             → live chat
 *   conversations        → conversation list updates
 *   doctor_profiles      → status changes
 *   notifications        → live bell icon
 *   consultations        → session status changes
 *
 * Presence:
 *   initPresence()       → track current user as online
 *   isUserOnline()       → check if a user is online
 *   subscribeToPresence()→ react to online/offline changes
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

// ── 1. Queue position for a specific doctor ───────────────────
export function subscribeToQueue(
  doctorId: string,
  onUpdate: (rows: QueueRow[]) => void
): () => void {
  const channel = supabase
    .channel(`queue:${doctorId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'consultation_queue',
      filter: `doctor_id=eq.${doctorId}`,
    }, async () => {
      const { data } = await supabase
        .from('consultation_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('status', 'waiting')
        .order('queue_position', { ascending: true });
      onUpdate(data ?? []);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 2. Patient's own queue position ───────────────────────────
export function subscribeToPatientQueuePosition(
  doctorId: string,
  patientId: string,
  onUpdate: (entry: QueueRow | null) => void
): () => void {
  const channel = supabase
    .channel(`queue-patient:${patientId}:${doctorId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'consultation_queue',
      filter: `patient_id=eq.${patientId}`,
    }, async () => {
      const { data } = await supabase
        .from('consultation_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('patient_id', patientId)
        .eq('status', 'waiting')
        .maybeSingle();
      onUpdate(data ?? null);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 3. Live chat — by consultation_id ────────────────────────
export function subscribeToMessages(
  consultationId: string,
  onNewMessage: (message: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`messages:consultation:${consultationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `consultation_id=eq.${consultationId}`,
    }, (payload) => {
      onNewMessage(payload.new as MessageRow);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 3b. Live chat — by doctor+patient pair (PRIMARY) ─────────
// Messages stored via doctor_id+patient_id pair use this.
// Supabase only supports single-column eq filters on realtime,
// so we filter by doctor_id and check patient_id client-side.
export function subscribeToDirectMessages(
  doctorId: string,
  patientId: string,
  onNewMessage: (message: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`messages:direct:${doctorId}:${patientId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `doctor_id=eq.${doctorId}`,
    }, (payload) => {
      const msg = payload.new as MessageRow;
      if (msg.patient_id === patientId) {
        onNewMessage(msg);
      }
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 4. Doctor status changes ──────────────────────────────────
export function subscribeToDoctorStatus(
  doctorId: string,
  onStatusChange: (status: DoctorStatusDB) => void
): () => void {
  const channel = supabase
    .channel(`doctor-status:${doctorId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'doctor_profiles',
      filter: `id=eq.${doctorId}`,
    }, (payload) => {
      onStatusChange((payload.new as DoctorRow).status);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 5. All doctor statuses ────────────────────────────────────
export function subscribeToAllDoctorStatuses(
  onStatusChange: (doctorId: string, status: DoctorStatusDB) => void
): () => void {
  const channel = supabase
    .channel('all-doctor-statuses')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'doctor_profiles',
    }, (payload) => {
      const updated = payload.new as DoctorRow;
      if (payload.old && (payload.old as DoctorRow).status !== updated.status) {
        onStatusChange(updated.id, updated.status);
      }
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 6. Consultation status updates ────────────────────────────
export function subscribeToConsultationStatus(
  consultationId: string,
  onStatusChange: (status: ConsultStatus) => void
): () => void {
  const channel = supabase
    .channel(`consultation:${consultationId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'consultations',
      filter: `id=eq.${consultationId}`,
    }, (payload) => {
      onStatusChange((payload.new as ConsultRow).status);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 7. Notification feed ──────────────────────────────────────
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notif: NotifRow) => void
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      onNewNotification(payload.new as NotifRow);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 8. Conversation list updates (sidebar refresh) ────────────
export function subscribeToConversations(
  doctorId: string,
  onUpdate: (convo: any) => void
): () => void {
  const channel = supabase
    .channel(`conversations:doctor:${doctorId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
      filter: `doctor_id=eq.${doctorId}`,
    }, (payload) => { onUpdate(payload.new); })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ── 9. Presence — who is online ───────────────────────────────
let _presenceChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Call once when a user logs in to mark them as online.
 * Returns an unsubscribe/cleanup function.
 */
export function initPresence(userId: string): () => void {
  if (_presenceChannel) {
    supabase.removeChannel(_presenceChannel);
    _presenceChannel = null;
  }

  _presenceChannel = supabase.channel('online-users', {
    config: { presence: { key: userId } },
  });

  _presenceChannel
    .on('presence', { event: 'sync' }, () => { /* synced */ })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await _presenceChannel!.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    if (_presenceChannel) {
      supabase.removeChannel(_presenceChannel);
      _presenceChannel = null;
    }
  };
}

/**
 * Check if a user is currently online.
 */
export function isUserOnline(userId: string): boolean {
  if (!_presenceChannel) return false;
  try {
    const state = _presenceChannel.presenceState();
    return userId in state;
  } catch {
    return false;
  }
}

/**
 * Subscribe to presence changes. Calls onSync with the full list
 * of online user IDs whenever someone joins or leaves.
 */
export function subscribeToPresence(
  onSync: (onlineUserIds: string[]) => void
): () => void {
  const channel = supabase.channel('presence-watch', {
    config: { presence: { key: 'watcher' } },
  });

  const getIds = () => Object.keys(channel.presenceState());

  channel
    .on('presence', { event: 'sync' }, () => onSync(getIds()))
    .on('presence', { event: 'join' }, () => onSync(getIds()))
    .on('presence', { event: 'leave' }, () => onSync(getIds()))
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
