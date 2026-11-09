import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { fetchAnalytics } from '@/lib/server/admin-extra';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const n = Number(new URL(req.url).searchParams.get('days'));
        const days = [7, 30, 90].includes(n) ? n : 30;
        return NextResponse.json({ data: await fetchAnalytics(days) });
    } catch (err: any) {
        console.error('[admin/analytics GET]', err.message);
        const missing = /admin_analytics|function|does not exist/i.test(err.message);
        return NextResponse.json(
            { data: null, error: missing ? 'The admin_analytics function is missing. Run the Batch 4 SQL.' : err.message },
            { status: 500 },
        );
    }
}