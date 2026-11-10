import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { fetchAttention } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        return NextResponse.json({ data: await fetchAttention() });
    } catch (err: any) {
        return NextResponse.json({ data: { total: 0, items: [] }, error: err.message }, { status: 500 });
    }
}