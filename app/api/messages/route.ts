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

  if (!consultationId) {
    return NextResponse.json({ data: [], error: 'consultationId is required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('messages')
      .select('*')
      .eq('consultation_id', consultationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[messages GET]', error.message);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
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

  const { consultationId, senderId, senderRole, body: text } = body ?? {};
  if (!consultationId || !senderId || !text) {
    return NextResponse.json(
      { error: 'consultationId, senderId, and body are required' },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('messages')
      .insert({
        consultation_id: consultationId,
        sender_id: senderId,
        sender_role: senderRole ?? 'patient',
        body: text,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[messages POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate notification for the receiver
    try {
      const { createNotification } = await import('@/lib/server/queries');
      // Get the consultation to determine the other party
      const { data: consult } = await admin
        .from('consultations')
        .select('patient_id, doctor_id, doctor_profiles!doctor_id(user_id, users!user_id(name))')
        .eq('id', consultationId)
        .single();

      if (consult) {
        const isDoctorSender = senderRole === 'doctor';
        const receiverUserId = isDoctorSender
          ? (consult as any).patient_id
          : (consult as any).doctor_profiles?.user_id;
        const senderName = isDoctorSender
          ? ((consult as any).doctor_profiles?.users?.name ?? 'Your doctor')
          : 'A patient';

        if (receiverUserId) {
          await createNotification({
            userId: receiverUserId,
            type: 'chat',
            title: `New message from ${senderName}`,
            message: text.length > 60 ? text.substring(0, 60) + '...' : text,
            doctorName: isDoctorSender ? senderName : undefined,
            actionUrl: '/appointments',
          });
        }
      }
    } catch (notifErr) {
      // Non-fatal
      console.warn('[messages POST] notification error:', notifErr);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[messages POST] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
