import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { listAdmins } from '@/lib/server/admin-extra';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        return NextResponse.json({
            data: await listAdmins(),
            me: { id: auth.user.id, isSuperAdmin: !!auth.user.isSuperAdmin },
        });
    } catch (err: any) {
        console.error('[admin/admins GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}