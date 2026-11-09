import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';

// Depends on the caller's token, so it must never be prerendered/cached
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { fetchOverview } = await import('@/lib/server/admin-extra');
        return NextResponse.json({ data: await fetchOverview() });
    } catch (err: any) {
        console.error('[admin/stats GET]', err.message);
        return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
}
