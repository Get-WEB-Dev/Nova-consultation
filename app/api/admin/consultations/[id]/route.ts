import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { getConsultationDetail } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';

// Session facts and message COUNTS only. Chat content and clinical notes are never returned here.
export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return NextResponse.json({ error: 'Invalid consultation id' }, { status: 400 });
    try {
        const data = await getConsultationDetail(params.id);
        if (!data) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
        return NextResponse.json({ data });
    } catch (err: any) {
        console.error('[admin/consultations/:id GET]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}