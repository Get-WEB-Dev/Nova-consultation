import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { getDoctorDetail } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return NextResponse.json({ error: 'Invalid doctor id' }, { status: 400 });
    try {
        const data = await getDoctorDetail(params.id);
        if (!data) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
        return NextResponse.json({ data });
    } catch (err: any) {
        console.error('[admin/doctors/:id GET]', err.message);
        const missing = /admin_doctor_metrics|does not exist/i.test(err.message);
        return NextResponse.json({ error: missing ? 'Run the Phase 1 SQL (admin_doctor_metrics is missing).' : err.message }, { status: 500 });
    }
}