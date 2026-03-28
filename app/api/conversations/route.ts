/**
 * Conversations API
 *
 * GET /api/conversations?doctorId=<uuid>
 *   Returns all conversations for a doctor, with:
 *   - patient info (name, avatar, user_id)
 *   - last message preview and timestamp
 *   - unread message count
 *
 * GET /api/conversations?patientId=<uuid>
 *   Returns all conversations for a patient.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');

  if (!doctorId && !patientId) {
    return NextResponse.json({ data: [], error: 'doctorId or patientId required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    if (doctorId) {
      // Resolve: if doctorId is actually a user_id, map it to doctor_profiles.id
      let resolvedDoctorId = doctorId;
      try {
        const { data: profile } = await admin
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', doctorId)
          .maybeSingle() as { data: { id: string } | null };
        if (profile) resolvedDoctorId = profile.id;
      } catch { /* use as-is */ }

      // Fetch all conversations for this doctor
      const { data: convs, error } = await admin
        .from('conversations')
        .select('*')
        .eq('doctor_id', resolvedDoctorId)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      if (!convs || convs.length === 0) {
        return NextResponse.json({ data: [] });
      }

      // Fetch patient info and last message + unread count for each conversation
      const enriched = await Promise.all(
        (convs as any[]).map(async (conv: any) => {
          // Get patient user info
          const { data: patient } = await admin
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', conv.patient_id)
            .single() as { data: any };

          // Get last message
          const { data: lastMsgs } = await admin
            .from('messages')
            .select('body, attachment_name, created_at, sender_role')
            .eq('doctor_id', doctorId)
            .eq('patient_id', conv.patient_id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1) as { data: any[] | null };

          const lastMsg = lastMsgs?.[0];

          // Get unread count (messages sent by patient that the doctor hasn't read)
          // We use a count query on recent messages from patient
          const { count: unreadCount } = await admin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', doctorId)
            .eq('patient_id', conv.patient_id)
            .eq('sender_role', 'patient')
            .is('deleted_at', null)
            .gte('created_at', conv.last_message_time) as { count: number | null };

          return {
            conversationId: conv.id,
            patientId: conv.patient_id,
            patientName: patient?.name ?? 'Unknown Patient',
            patientAvatar: patient?.avatar_url ?? null,
            lastMessage: lastMsg?.body
              ? (lastMsg.body.length > 60 ? lastMsg.body.slice(0, 60) + '...' : lastMsg.body)
              : lastMsg?.attachment_name
                ? `📎 ${lastMsg.attachment_name}`
                : '',
            lastMessageTime: lastMsg?.created_at ?? conv.last_message_time,
            lastMessageRole: lastMsg?.sender_role ?? null,
            unreadCount: unreadCount ?? 0,
          };
        })
      );

      return NextResponse.json({ data: enriched });
    }

    if (patientId) {
      const { data: convs, error } = await admin
        .from('conversations')
        .select('*')
        .eq('patient_id', patientId)
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data: (convs as any[]) ?? [] });
    }

  } catch (err: any) {
    console.error('[conversations GET]', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}
