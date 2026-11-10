import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { cleanSearch } from '@/lib/server/admin-list';
import { globalSearch } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const q = cleanSearch(new URL(req.url).searchParams.get('q'));
        return NextResponse.json({ results: await globalSearch(q) });
    } catch (err: any) {
        console.error('[admin/search GET]', err.message);
        return NextResponse.json({ results: [], error: err.message }, { status: 500 });
    }
}