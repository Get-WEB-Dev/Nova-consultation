import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { checkSystemHealth } = await import('@/lib/server/admin-queries');
        return NextResponse.json({ data: await checkSystemHealth() });
    } catch (err: any) {
        return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
}