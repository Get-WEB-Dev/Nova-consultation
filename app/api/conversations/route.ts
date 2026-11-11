/**
 * Conversations
 *   GET  /api/conversations?doctorId=…   the doctor's chat list (patient, preview, unread)
 *   GET  /api/conversations?patientId=…  the patient's chats
 *   POST /api/conversations              a doctor opens (or reuses) a chat with one of their patients
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { requireUser, isSelf, ownsDoctorId, forbidden, isUuid, resolveDoctorProfileId, doctorHasPatient } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');

  if (!doctorId && !patientId) {
    return NextResponse.json({ data: [], error: 'doctorId or patientId required' }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  if (doctorId && !ownsDoctorId(auth.user, doctorId)) return forbidden();
  if (!doctorId && !isSelf(auth.user, patientId)) return forbidden();

  try {
    const admin: any = createAdminClient();

    if (doctorId) {
      const profileId = await resolveDoctorProfileId(doctorId);
      if (!profileId) return NextResponse.json({ data: [] });

      const { data: convs, error } = await admin
        .from('conversations')
        .select('id, patient_id, last_message_preview, last_message_time')
        .eq('doctor_id', profileId)
        .order('last_message_time', { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!convs || convs.length === 0) return NextResponse.json({ data: [] });

      const patientIds: string[] = convs.map((c: any) => c.patient_id);

      // Two batched queries instead of three queries PER conversation
      const [patientsRes, unreadRes] = await Promise.all([
        admin.from('users').select('id, name, avatar_url').in('id', patientIds),
        admin.from('messages').select('patient_id')
          .eq('doctor_id', profileId).eq('sender_role', 'patient')
          .is('read_at', null).is('deleted_at', null)
          .in('patient_id', patientIds).limit(5000),
      ]);

      // If the read-tracking column is missing the migration has not been run yet
      const needsMigration = !!unreadRes.error && /read_at/.test(unreadRes.error.message);
      if (unreadRes.error && !needsMigration) throw unreadRes.error;

      const patients = new Map<string, any>((patientsRes.data ?? []).map((p: any) => [p.id, p]));
      const unread = new Map<string, number>();
      for (const row of unreadRes.data ?? []) unread.set(row.patient_id, (unread.get(row.patient_id) ?? 0) + 1);

      return NextResponse.json({
        needsMigration,
        data: convs.map((c: any) => ({
          conversationId: c.id,
          patientId: c.patient_id,
          patientName: patients.get(c.patient_id)?.name ?? 'Unknown patient',
          patientAvatar: patients.get(c.patient_id)?.avatar_url ?? null,
          lastMessage: c.last_message_preview ?? '',
          lastMessageTime: c.last_message_time,
          unreadCount: unread.get(c.patient_id) ?? 0,
        })),
      });
    }

    const { data: convs, error } = await admin
      .from('conversations')
      .select('*')
      .eq('patient_id', patientId)
      .order('last_message_time', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: convs ?? [] });
  } catch (err: any) {
    console.error('[conversations GET]', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['doctor', 'professional']);
  if (auth.error) return auth.error;
  const profileId = auth.user.doctorProfileId;
  if (!profileId) return forbidden('A doctor profile is required');

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  const patientId = body?.patientId;
  if (!isUuid(patientId)) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });

  try {
    const admin: any = createAdminClient();

    // Doctors can message their own patients (people they have had a consultation with),
    // or anyone who already started a chat with them.
    const { data: existing } = await admin.from('conversations').select('id')
      .eq('doctor_id', profileId).eq('patient_id', patientId).maybeSingle();
    if (!existing && !(await doctorHasPatient(profileId, patientId))) {
      return forbidden('You can only message patients you have consulted.');
    }

    let conversationId: string | undefined = existing?.id;
    if (!conversationId) {
      const { data: created, error } = await admin.from('conversations')
        .upsert({ doctor_id: profileId, patient_id: patientId }, { onConflict: 'doctor_id,patient_id' })
        .select('id').single();
      if (error) throw error;
      conversationId = created.id;
    }

    const { data: patient } = await admin.from('users').select('id, name, avatar_url').eq('id', patientId).maybeSingle();
    return NextResponse.json({
      data: {
        conversationId,
        patientId,
        patientName: patient?.name ?? 'Patient',
        patientAvatar: patient?.avatar_url ?? null,
      },
    });
  } catch (err: any) {
    console.error('[conversations POST]', err.message);
    return NextResponse.json({ error: 'Could not open the conversation' }, { status: 500 });
  }
}