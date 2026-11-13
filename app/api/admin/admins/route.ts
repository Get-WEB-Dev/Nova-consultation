import { NextResponse } from 'next/server';
import { requireUser, requireSuperAdmin, isUuid } from '@/lib/server/auth';
import { listAdmins } from '@/lib/server/admin-extra';
import { setAdminAccess, AccessError } from '@/lib/server/admin-access';
import { logAdminAction } from '@/lib/server/admin-queries';
import { PRESETS } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

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

// body: { userId, preset?: 'operations' | ..., superAdmin?: boolean }  (super admins only)
export async function PATCH(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (auth.error) return auth.error;
    try {
        const { userId, preset, superAdmin } = await req.json();
        if (!isUuid(userId)) return fail('A valid userId is required');
        if (userId === auth.user.id) return fail('You cannot change your own access');
        if (preset === undefined && superAdmin === undefined) return fail('Nothing to change');
        if (preset !== undefined && !(preset in PRESETS)) return fail('Unknown access level');
        if (superAdmin !== undefined && typeof superAdmin !== 'boolean') return fail('superAdmin must be true or false');

        await setAdminAccess(userId, { preset, superAdmin });
        await logAdminAction(
            auth.user,
            superAdmin !== undefined ? 'admin.super_changed' : 'admin.access_changed',
            'user', userId,
            superAdmin !== undefined ? (superAdmin ? 'made super admin' : 'removed super admin') : `access: ${preset}`,
        );
        return NextResponse.json({ success: true });
    } catch (err: any) {
        if (err instanceof AccessError) return fail(err.message, err.status);
        console.error('[admin/admins PATCH]', err.message);
        return fail(err.message, 500);
    }
}