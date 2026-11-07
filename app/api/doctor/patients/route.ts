import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, ownsDoctorId, forbidden } from '@/lib/server/auth';

// Depends on the caller's token, so it must never be prerendered/cached
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }
    if (!ownsDoctorId(auth.user, doctorId)) return forbidden();

    try {
        const { fetchDoctorPatients } = await import('@/lib/server/doctor-queries');
        const patients = await fetchDoctorPatients(doctorId);
        return NextResponse.json({ data: patients });
    } catch (err: any) {
        console.error('[doctor/patients GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}
