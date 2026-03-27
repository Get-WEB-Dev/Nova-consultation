import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// To restore mock data for testing, rename data/doctors.mock.json → data/doctors.json
// and uncomment:
// import doctorsMock from '@/data/doctors.mock.json';
// ─────────────────────────────────────────────────────────────

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const specialty = searchParams.get('specialty');

  try {
    const { fetchDoctors } = await import('@/lib/server/queries');
    const doctors = await fetchDoctors();

    const formatted = doctors.map((d) => ({
      id: d.id,
      name: (d as any).users?.name ?? '',
      specialty: d.specialty,
      hospital: d.hospital ?? '',
      experience: d.experience_years,
      rating: d.rating,
      reviews: d.review_count,
      avatar: (d as any).profile_picture ?? (d as any).users?.avatar_url
        ?? `https://ui-avatars.com/api/?name=${encodeURIComponent((d as any).users?.name ?? '')}&background=1B3A5C&color=fff&size=128`,
      bio: '',
      languages: d.languages ?? [],
      available: d.status === 'available',
      fee: d.fee,
      tags: d.tags ?? [],
      gender: d.gender,
      patientsServed: d.patients_served,
      consultationType: d.consultation_type,
      status: d.status,
      onlineNow: d.status !== 'offline',
      locationCity: d.location_city ?? '',
      consultationDurationMinutes: d.consultation_duration_mins,
      nextAvailableSlot: d.next_available_slot,
      slug: d.slug,
    }));

    let result = formatted;
    if (status) result = result.filter((d) => d.status === status);
    if (specialty) result = result.filter((d) => d.specialty === specialty);

    return NextResponse.json(
      { data: result, count: result.length },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err: any) {
    console.error('[doctors GET]', err.message);
    return NextResponse.json({ data: [], count: 0, error: err.message }, { status: 500 });
  }
}
