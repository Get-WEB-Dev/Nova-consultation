import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { fetchAllUsers } = await import('@/lib/server/admin-queries');
        const users = await fetchAllUsers();
        return NextResponse.json({ data: users });
    } catch (err: any) {
        console.error('[admin/users GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const body = await req.json();
        const { userId, role } = body;
        if (!['patient', 'doctor', 'professional', 'admin'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }
        if (userId === auth.user.id) {
            return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
        }
        if (!userId || !role) {
            return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
        }
        const { updateUserRole } = await import('@/lib/server/admin-queries');
        await updateUserRole(userId, role);
        const { logAdminAction } = await import('@/lib/server/admin-queries');
        await logAdminAction(auth.user, 'user.role_changed', 'user', userId, `role → ${role}`);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const body = await req.json();
        const { userId } = body;
        if (userId === auth.user.id) {
            return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
        }
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }
        // Remember who it was before they are gone (for the audit log)
        const { data: target } = await (createAdminClient() as any).from('users').select('email').eq('id', userId).maybeSingle();
        const { deleteUser, logAdminAction } = await import('@/lib/server/admin-queries');
        await deleteUser(userId);
        await logAdminAction(auth.user, 'user.deleted', 'user', userId, target?.email ?? undefined);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users DELETE]', err.message);
        if (/foreign key|violates/i.test(err.message)) {
            return NextResponse.json(
                { error: 'This user has consultations on record and cannot be deleted. Change their role instead.' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
