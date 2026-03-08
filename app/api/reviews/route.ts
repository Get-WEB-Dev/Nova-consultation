import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');

  if (!doctorId) {
    return NextResponse.json({ data: [] });
  }

  try {
    const { fetchDoctorReviews } = await import('@/lib/server/queries');
    const reviews = await fetchDoctorReviews(doctorId);

    const formatted = reviews.map((r: any) => ({
      id:        r.id,
      author:    r.patient_name ?? 'Anonymous',
      rating:    r.rating,
      text:      r.comment      ?? '',
      date:      r.created_at,
      avatar:    `https://ui-avatars.com/api/?name=${encodeURIComponent(r.patient_name ?? 'P')}&background=eef4fa&color=1B3A5C&size=40`,
      patientId: r.patient_id,
    }));

    return NextResponse.json({ data: formatted });
  } catch (err: any) {
    console.error('[reviews GET]', err.message);
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { consultationId, doctorId, patientId, rating, comment } = body ?? {};
  if (!consultationId || !doctorId || !patientId || !rating) {
    return NextResponse.json(
      { error: 'consultationId, doctorId, patientId, and rating are required' },
      { status: 400 }
    );
  }

  try {
    const { submitReview } = await import('@/lib/server/queries');
    await submitReview({ consultationId, doctorId, patientId, rating, comment });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[reviews POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
