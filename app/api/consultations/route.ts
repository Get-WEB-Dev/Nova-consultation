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
      id:                  row.id,
      doctorId:            row.doctor_id,
      doctorName:          row.doctor_name          ?? '',
      doctorSpecialty:     row.doctor_specialty      ?? '',
      doctorAvatar:        row.doctor_avatar         ?? '',
      patientId:           row.patient_id,
      status:              row.status,
      startedAt:           row.started_at            ?? null,
      endedAt:             row.ended_at              ?? null,
      durationMinutes:     row.duration_minutes      ?? null,
      notes:               row.notes                 ?? null,
      summary:             row.summary               ?? null,
      isFollowUp:          row.is_follow_up          ?? false,
      followUpScheduledAt: row.follow_up_scheduled_at ?? null,
      created_at:          row.created_at,
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

  const { doctorId, patientId, isFollowUp, followUpScheduledAt } = body ?? {};
  if (!doctorId || !patientId) {
    return NextResponse.json({ error: 'doctorId and patientId are required' }, { status: 400 });
  }

  try {
    const { createConsultation } = await import('@/lib/server/queries');
    const session = await createConsultation({
      doctorId,
      patientId,
      isFollowUp:          isFollowUp          ?? false,
      followUpScheduledAt: followUpScheduledAt ?? undefined,
    });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (err: any) {
    console.error('[consultations POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
