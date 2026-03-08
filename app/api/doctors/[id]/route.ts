import { NextResponse } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// import doctorsMock from '@/data/doctors.mock.json';
// ─────────────────────────────────────────────────────────────

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const { fetchDoctorByIdOrSlug } = await import('@/lib/server/queries');
    const doc = await fetchDoctorByIdOrSlug(id);
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const formatted = {
      id:                          doc.id,
      name:                        (doc as any).users?.name ?? '',
      specialty:                   doc.specialty,
      hospital:                    doc.hospital ?? '',
      experience:                  doc.experience_years,
      rating:                      doc.rating,
      reviews:                     doc.review_count,
      avatar:                      (doc as any).users?.avatar_url ?? '',
      bio:                         '',
      languages:                   doc.languages ?? [],
      available:                   doc.status === 'available',
      fee:                         doc.fee,
      tags:                        doc.tags ?? [],
      gender:                      doc.gender,
      patientsServed:              doc.patients_served,
      consultationType:            doc.consultation_type,
      status:                      doc.status,
      onlineNow:                   doc.status !== 'offline',
      locationCity:                doc.location_city ?? '',
      consultationDurationMinutes: doc.consultation_duration_mins,
      nextAvailableSlot:           doc.next_available_slot,
      slug:                        doc.slug,
    };

    return NextResponse.json(
      { data: formatted },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (err: any) {
    console.error('[doctors/[id] GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
