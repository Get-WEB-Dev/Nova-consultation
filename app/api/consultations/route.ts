import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveDoctorProfileId } from '@/lib/server/auth';
import { requireUser, isSelf, ownsDoctorId, forbidden } from '@/lib/server/auth';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// import consultationsMock from '@/data/consultations.mock.json';
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json([], { status: 200 });
  }

  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  if (!isSelf(auth.user, patientId)) return forbidden();

  try {
    const { fetchConsultationsByPatient } = await import('@/lib/server/queries');
    const data = await fetchConsultationsByPatient(patientId);

    const formatted = data.map((row: any) => ({
      id: row.id,
      doctorId: row.doctor_id,
      doctorName: row.doctor_profiles?.users?.name ?? '',
      doctorSpecialty: row.doctor_profiles?.specialty ?? '',
      doctorAvatar: row.doctor_profiles?.users?.avatar_url
        ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(row.doctor_profiles?.users?.name ?? 'D')}&background=1B3A5C&color=fff&size=128`,
      patientId: row.patient_id,
      status: row.status,
      startedAt: row.started_at ?? null,
      endedAt: row.ended_at ?? null,
      durationMinutes: row.duration_minutes ?? null,
      notes: row.notes ?? null,
      summary: row.summary ?? null,
      symptoms: row.symptoms ?? null,
      durationDescription: row.duration_description ?? null,
      isFollowUp: row.is_follow_up ?? false,
      followUpScheduledAt: row.follow_up_scheduled_at ?? null,
      created_at: row.created_at,
    }));

    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error('[consultations GET]', err.message);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { doctorId, patientId, isFollowUp, followUpScheduledAt, symptoms, duration, notes } = body ?? {};
  if (!doctorId || !patientId) {
    return NextResponse.json({ error: 'doctorId and patientId are required' }, { status: 400 });
  }

  // Only the patient themself, or the doctor the consultation is with, may create it
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  if (auth.user.id !== patientId && !ownsDoctorId(auth.user, doctorId)) return forbidden();

  try {
    const { createAdminClient: makeAdmin } = await import('@/lib/supabase/client');
    const db: any = makeAdmin();
    const profileId = (await resolveDoctorProfileId(doctorId)) ?? doctorId;

    // Attach a consultation to the patient's waiting queue row, so the id survives page refreshes
    const linkToQueue = (consultationId: string) =>
      db.from('consultation_queue')
        .update({ consultation_id: consultationId })
        .eq('doctor_id', profileId)
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called', 'joined'])
        .is('consultation_id', null);

    // Idempotent: if this patient already has an open consultation with this doctor
    // (created in the last 24h), reuse it instead of creating a duplicate.
    if (!isFollowUp) {
      const { data: existing } = await db
        .from('consultations')
        .select('*')
        .eq('doctor_id', profileId)
        .eq('patient_id', patientId)
        .eq('is_follow_up', false)
        .in('status', ['waiting', 'active'])
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        await linkToQueue(existing.id);
        return NextResponse.json({ data: existing, reused: true });
      }
    }

    const { createConsultation, createNotification } = await import('@/lib/server/queries');
    const session = await createConsultation({
      doctorId,
      patientId,
      isFollowUp: isFollowUp ?? false,
      followUpScheduledAt: followUpScheduledAt ?? undefined,
      symptoms: symptoms ?? undefined,
      durationDescription: duration ?? undefined,
      notes: notes ?? undefined,
    });

    await linkToQueue(session.id);

    // Generate notification for the doctor
    try {
      const { createAdminClient } = await import('@/lib/supabase/client');
      const admin = createAdminClient();

      // Get doctor's user_id and patient name
      const { data: doctorProfile } = await admin
        .from('doctor_profiles')
        .select('user_id')
        .eq('id', doctorId)
        .single();

      const { data: patient } = await admin
        .from('users')
        .select('name')
        .eq('id', patientId)
        .single();

      if (doctorProfile) {
        await createNotification({
          userId: (doctorProfile as any).user_id,
          type: 'new_consultation',
          title: 'New consultation request',
          message: `${(patient as any)?.name ?? 'A patient'} has requested a consultation.`,
          actionUrl: '/doctor-dashboard',
        });
      }
    } catch (notifErr) {
      console.warn('[consultations POST] notification error:', notifErr);
    }

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err: any) {
    console.error('[consultations POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

