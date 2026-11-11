/**
 * Messages API
 *
 * GET  /api/messages?consultationId=<uuid>   — fetch message history
 * POST /api/messages                         — send a message
 *      body: { consultationId, senderId, senderRole, body }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, getThreadAccess, forbidden } from '@/lib/server/auth';
import { parseAttachmentRef } from '@/lib/attachment-ref';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const consultationId = searchParams.get('consultationId');
  const conversationId = searchParams.get('conversationId');
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');
  const validDate = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? v : undefined);
  const after = validDate(searchParams.get('after'));
  const before = validDate(searchParams.get('before'));
  const limit = parseInt(searchParams.get('limit') ?? '', 10) || undefined;

  // We need at least one way to identify the message thread
  if (!consultationId && !conversationId && (!doctorId || !patientId)) {
    return NextResponse.json({ data: [], error: 'consultationId, conversationId, or both doctorId and patientId are required' }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const thread = await getThreadAccess(auth.user, { consultationId, conversationId, doctorId, patientId });
  if (!thread) return forbidden();

  try {
    const { fetchMessages } = await import('@/lib/server/queries');

    let resolvedDoctorId = doctorId ?? undefined;
    let resolvedPatientId = patientId ?? undefined;

    // If conversationId is provided, look up the conversation to get doctor_id and patient_id
    if (conversationId && !consultationId && (!doctorId || !patientId)) {
      const admin = createAdminClient();
      const { data: conv } = await admin
        .from('conversations')
        .select('doctor_id, patient_id')
        .eq('id', conversationId)
        .single() as { data: { doctor_id: string; patient_id: string } | null };

      if (conv) {
        resolvedDoctorId = conv.doctor_id;
        resolvedPatientId = conv.patient_id;
      } else {
        return NextResponse.json({ data: [], error: 'Conversation not found' }, { status: 404 });
      }
    }

    const data = await fetchMessages({
      consultationId: consultationId ?? undefined,
      doctorId: resolvedDoctorId,
      patientId: resolvedPatientId,
      after,
      before,
      limit,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[messages GET] unexpected:', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    consultationId,
    conversationId,
    doctorId,
    patientId,
    body: text,
    attachmentUrl,
    attachmentName,
    attachmentType,
    attachmentSize
  } = body ?? {};

  if (!text && !attachmentUrl) {
    return NextResponse.json(
      { error: 'Either body or attachment is required' },
      { status: 400 }
    );
  }

  // The sender is always the signed-in user, and must belong to this thread
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const thread = await getThreadAccess(auth.user, { consultationId, conversationId, doctorId, patientId });
  if (!thread) return forbidden();

  // An attachment must be a file THIS user uploaded (stops pointing a message at someone else's file)
  if (attachmentUrl) {
    const ref = parseAttachmentRef(attachmentUrl);
    if (!ref || !ref.path.startsWith(`${auth.user.id}/`)) {
      return NextResponse.json({ error: 'Invalid attachment. Please upload the file again.' }, { status: 400 });
    }
  }
  const senderId = auth.user.id;
  const senderRole: 'doctor' | 'patient' = thread.asDoctor ? 'doctor' : 'patient';

  try {
    const { sendMessage, sendAttachmentMessage } = await import('@/lib/server/queries');
    let message: any;

    // Resolve conversationId → doctorId + patientId if needed
    let resolvedDoctorId = thread.doctorProfileId ?? doctorId;
    let resolvedPatientId = thread.patientId ?? patientId;
    if (conversationId && (!doctorId || !patientId)) {
      const admin = createAdminClient();
      const { data: conv } = await admin
        .from('conversations')
        .select('doctor_id, patient_id')
        .eq('id', conversationId)
        .single() as { data: { doctor_id: string; patient_id: string } | null };
      if (conv) {
        resolvedDoctorId = resolvedDoctorId || conv.doctor_id;
        resolvedPatientId = resolvedPatientId || conv.patient_id;
      }
    }

    if (attachmentUrl) {
      message = await sendAttachmentMessage({
        consultationId,
        doctorId: resolvedDoctorId,
        patientId: resolvedPatientId,
        senderId,
        senderRole: senderRole ?? 'patient',
        attachmentUrl,
        attachmentName: attachmentName ?? 'file',
        attachmentType: attachmentType ?? 'other',
        attachmentSize: attachmentSize ?? 0,
      });
    } else {
      message = await sendMessage({
        consultationId,
        doctorId: resolvedDoctorId,
        patientId: resolvedPatientId,
        senderId,
        senderRole: senderRole ?? 'patient',
        body: text,
      });
    }

    // Generate notification for the receiver
    try {
      const { createNotification } = await import('@/lib/server/queries');
      const admin = (await import('@/lib/supabase/client')).createAdminClient();

      let receiverUserId: string | null = null;
      let senderName = 'Someone';

      if (consultationId) {
        const { data: consult } = await admin
          .from('consultations')
          .select('patient_id, doctor_id, doctor_profiles!doctor_id(user_id, users!user_id(name))')
          .eq('id', consultationId)
          .single();

        if (consult) {
          const isDoctorSender = senderRole === 'doctor';
          receiverUserId = isDoctorSender
            ? (consult as any).patient_id
            : (consult as any).doctor_profiles?.user_id;
          senderName = isDoctorSender
            ? ((consult as any).doctor_profiles?.users?.name ?? 'Your doctor')
            : 'A patient';
        }
      } else if (doctorId && patientId) {
        // Fallback if no consultationId
        if (senderRole === 'doctor') {
          receiverUserId = patientId;
          const { data: d } = await admin.from('doctor_profiles').select('users(name)').eq('id', doctorId).single();
          senderName = (d as any)?.users?.name ?? 'Your doctor';
        } else {
          const { data: d } = await admin.from('doctor_profiles').select('user_id').eq('id', doctorId).single();
          receiverUserId = (d as any)?.user_id;
          senderName = 'A patient';
        }
      }

      if (receiverUserId) {
        await createNotification({
          userId: receiverUserId,
          type: 'chat',
          title: `New message from ${senderName}`,
          message: text ? (text.length > 60 ? text.substring(0, 60) + '...' : text) : 'Sent an attachment',
          doctorName: senderRole === 'doctor' ? senderName : undefined,
          actionUrl: senderRole === 'doctor' ? '/appointments' : '/doctor-dashboard/messages',
        });
      }
    } catch (notifErr) {
      console.warn('[messages POST] notification error:', notifErr);
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (err: any) {
    console.error('[messages POST] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
