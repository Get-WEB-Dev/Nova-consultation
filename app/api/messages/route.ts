/**
 * Messages API
 *
 * GET  /api/messages?consultationId=<uuid>   — fetch message history
 * POST /api/messages                         — send a message
 *      body: { consultationId, senderId, senderRole, body }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const consultationId = searchParams.get('consultationId');
  const conversationId = searchParams.get('conversationId');
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');

  // We need at least one way to identify the message thread
  if (!consultationId && !conversationId && (!doctorId || !patientId)) {
    return NextResponse.json({ data: [], error: 'consultationId, conversationId, or both doctorId and patientId are required' }, { status: 400 });
  }

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
    senderId,
    senderRole,
    body: text,
    attachmentUrl,
    attachmentName,
    attachmentType,
    attachmentSize
  } = body ?? {};

  if (!senderId || (!text && !attachmentUrl)) {
    return NextResponse.json(
      { error: 'senderId and either body or attachment are required' },
      { status: 400 }
    );
  }

  try {
    const { sendMessage, sendAttachmentMessage } = await import('@/lib/server/queries');
    let message: any;

    // Resolve conversationId → doctorId + patientId if needed
    let resolvedDoctorId = doctorId;
    let resolvedPatientId = patientId;
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
          actionUrl: '/appointments',
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
