import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { runSystemChecks } from '@/lib/server/admin-system';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        return NextResponse.json({ data: await runSystemChecks() });
    } catch (err: any) {
        console.error('[admin/system GET]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}