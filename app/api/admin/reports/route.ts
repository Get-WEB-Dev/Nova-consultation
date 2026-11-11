import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { parseReportRange, fetchReport } from '@/lib/server/admin-reports';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;

    const range = parseReportRange(new URL(req.url).searchParams);
    if ('error' in range) return NextResponse.json({ error: range.error }, { status: 400 });

    try {
        return NextResponse.json({ data: await fetchReport(range.from, range.to) });
    } catch (err: any) {
        console.error('[admin/reports GET]', err.message);
        const missing = /admin_report|does not exist/i.test(err.message);
        return NextResponse.json(
            { error: missing ? 'The admin_report function is missing. Run the Phase 2 SQL.' : err.message },
            { status: 500 },
        );
    }
}