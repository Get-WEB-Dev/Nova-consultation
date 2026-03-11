import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// import consultationsMock from '@/data/consultations.mock.json';
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json([], { status: 200 });
  }

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

  try {
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
          type: 'system',
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

