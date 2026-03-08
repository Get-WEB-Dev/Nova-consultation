import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    try {
        const { fetchDoctorPatients } = await import('@/lib/server/doctor-queries');
        const patients = await fetchDoctorPatients(doctorId);
        return NextResponse.json({ data: patients });
    } catch (err: any) {
        console.error('[doctor/patients GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}
