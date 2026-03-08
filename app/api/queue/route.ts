import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// const MOCK_QUEUE = { 'd2': { position: 2, estimatedWait: 8, total: 3 }, ... };
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId  = searchParams.get('doctorId');
  const patientId = searchParams.get('patientId');

  if (!doctorId) {
    return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
  }

  try {
    const { fetchQueue, fetchPatientQueueEntry } = await import('@/lib/server/queries');
    const queue = await fetchQueue(doctorId);

    if (patientId) {
      const entry = await fetchPatientQueueEntry(doctorId, patientId);
      return NextResponse.json({
        position:      entry?.queue_position   ?? null,
        estimatedWait: entry?.estimated_wait_mins ?? null,
        total:         queue.length,
        inQueue:       !!entry,
      });
    }

    return NextResponse.json({ total: queue.length, queue });
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

  try {
    const { leaveQueue } = await import('@/lib/server/queries');
    await leaveQueue(doctorId, patientId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[queue DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
