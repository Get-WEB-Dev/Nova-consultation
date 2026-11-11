import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { getAnnouncementDetail } from '@/lib/server/admin-extra';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return NextResponse.json({ error: 'Invalid announcement id' }, { status: 400 });
    try {
        const data = await getAnnouncementDetail(params.id);
        if (!data) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
        return NextResponse.json({ data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}