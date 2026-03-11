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
      id: r.id,
      author: r.patient_name ?? 'Anonymous',
      rating: r.rating,
      text: r.comment ?? '',
      date: r.created_at,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.patient_name ?? 'P')}&background=eef4fa&color=1B3A5C&size=40`,
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

    // Generate notification for the doctor
    try {
      const { createNotification } = await import('@/lib/server/queries');
      const { createAdminClient } = await import('@/lib/supabase/client');
      const admin = createAdminClient();

      const { data: doctorProfile } = await admin
        .from('doctor_profiles')
        .select('user_id')
        .eq('id', doctorId)
        .single();

      if (doctorProfile) {
        await createNotification({
          userId: (doctorProfile as any).user_id,
          type: 'system',
          title: 'New review received',
          message: `A patient has left a ${rating}-star review on your profile.`,
          actionUrl: '/doctor-dashboard',
        });
      }
    } catch (notifErr) {
      console.warn('[reviews POST] notification error:', notifErr);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error('[reviews POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
