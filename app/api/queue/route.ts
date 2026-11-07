import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, getAuthUser, isSelf, ownsDoctorId, forbidden, unauthorized } from '@/lib/server/auth';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// const MOCK_QUEUE = { 'd2': { position: 2, estimatedWait: 8, total: 3 }, ... };
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');

  if (!doctorId) {
    return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
  }

  // Who is asking? Anonymous visitors and other patients only get the queue SIZE.
  // The full queue (patient names/ids) is for the doctor who owns it.
  const user = await getAuthUser(req).catch(() => null);
  const isOwner = !!user && ownsDoctorId(user, doctorId);
  if (patientId) {
    if (!user) return unauthorized();
    if (!isSelf(user, patientId)) return forbidden();
  }

  try {
    const { fetchPatientQueueEntry } = await import('@/lib/server/queries');
    const { fetchDoctorProfileByUserId, fetchDoctorQueue } = await import('@/lib/server/doctor-queries');

    // Resolve: doctorId might be auth user_id or doctor_profiles.id
    let resolvedId = doctorId;
    const profile = await fetchDoctorProfileByUserId(doctorId) as any;
    if (profile?.id) resolvedId = profile.id;

    const rawQueue = await fetchDoctorQueue(resolvedId);
    // Format for frontend with patient names
    const queue = rawQueue.map((e: any) => ({
      id: e.id,
      patient_id: e.patient_id,
      patientName: e.users?.name ?? 'Patient',
      patientAvatar: e.users?.avatar_url ?? null,
      queue_position: e.queue_position,
      estimated_wait_mins: e.estimated_wait_mins,
      status: e.status,
      joined_at: e.joined_at,
      consultation_id: e.consultation_id,
    }));

    if (patientId) {
      const entry = await fetchPatientQueueEntry(resolvedId, patientId);
      return NextResponse.json({
        position: entry?.queue_position ?? null,
        estimatedWait: entry?.estimated_wait_mins ?? null,
        consultation_id: (entry as any)?.consultation_id ?? null,
        total: queue.length,
        inQueue: !!entry,
      });
    }

    if (!isOwner) return NextResponse.json({ total: queue.length, queue: [], data: [] });
    return NextResponse.json({ total: queue.length, queue, data: queue });
  } catch (err: any) {
    console.error('[queue GET]', err.message);
    return NextResponse.json({ error: err.message, total: 0, queue: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { doctorId, patientId, consultationId } = body ?? {};
  if (!doctorId || !patientId) {
    return NextResponse.json({ error: 'doctorId and patientId are required' }, { status: 400 });
  }

  // A patient can only put THEMSELVES in a queue
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  if (!isSelf(auth.user, patientId)) return forbidden();

  try {
    const { joinQueue } = await import('@/lib/server/queries');
    const entry = await joinQueue(doctorId, patientId, consultationId);
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (err: any) {
    console.error('[queue POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { doctorId, patientId } = body ?? {};
  if (!doctorId || !patientId) {
    return NextResponse.json({ error: 'doctorId and patientId are required' }, { status: 400 });
  }

  // A patient can leave their own queue spot; a doctor can remove people from their own queue
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  if (!isSelf(auth.user, patientId) && !ownsDoctorId(auth.user, doctorId)) return forbidden();

  try {
    const { leaveQueue } = await import('@/lib/server/queries');
    const { fetchDoctorProfileByUserId } = await import('@/lib/server/doctor-queries');

    // Resolve: doctorId might be auth user_id or doctor_profiles.id
    let resolvedId = doctorId;
    try {
      const profile = await fetchDoctorProfileByUserId(doctorId) as any;
      if (profile?.id) resolvedId = profile.id;
    } catch (_) { /* already a profile ID */ }

    await leaveQueue(resolvedId, patientId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[queue DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

