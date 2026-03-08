import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { fetchAllDoctors } = await import('@/lib/server/admin-queries');
        const doctors = await fetchAllDoctors();
        return NextResponse.json({ data: doctors });
    } catch (err: any) {
        console.error('[admin/doctors GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { doctorId, action, value } = body;
        if (!doctorId || !action) {
            return NextResponse.json({ error: 'doctorId and action required' }, { status: 400 });
        }

        if (action === 'publish') {
            const { toggleDoctorPublished } = await import('@/lib/server/admin-queries');
            await toggleDoctorPublished(doctorId, value ?? true);
        } else if (action === 'verify') {
            const { toggleDoctorVerified } = await import('@/lib/server/admin-queries');
            await toggleDoctorVerified(doctorId, value ?? true);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/doctors PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
