import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import {
    fetchAllUsers, updateUserRole, deleteUser, setUserSuspended,
    isSuperAdminUser, logAdminAction,
} from '@/lib/server/admin-queries';

const ROLES = ['patient', 'doctor', 'professional', 'admin'];

const fail = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });

async function loadTarget(userId: string) {
    const { data } = await (createAdminClient() as any)
        .from('users').select('id, email, role').eq('id', userId).maybeSingle();
    return data as { id: string; email: string; role: string } | null;
}

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        return NextResponse.json({ data: await fetchAllUsers() });
    } catch (err: any) {
        console.error('[admin/users GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

// Change role  -> body { userId, role }
// Suspend      -> body { userId, suspended: true,  reason? }
// Reactivate   -> body { userId, suspended: false }
export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { userId, role, suspended, reason } = await req.json();

        if (!isUuid(userId)) return fail('A valid userId is required');
        if (userId === auth.user.id) return fail('You cannot change your own account');

        const target = await loadTarget(userId);
        if (!target) return fail('User not found', 404);

        if (await isSuperAdminUser(userId)) {
            return fail('Super admin accounts cannot be modified here', 403);
        }
        // Touching an admin (or making one) needs a super admin
        if ((target.role === 'admin' || role === 'admin') && !auth.user.isSuperAdmin) {
            return fail('Only a super admin can grant or remove admin access', 403);
        }

        if (typeof suspended === 'boolean') {
            const why = typeof reason === 'string' ? reason.trim().slice(0, 300) : undefined;
            await setUserSuspended(userId, suspended, why);
            await logAdminAction(
                auth.user, suspended ? 'user.suspended' : 'user.reactivated',
                'user', userId, suspended ? (why || target.email) : target.email,
            );
            return NextResponse.json({ success: true });
        }

        if (!ROLES.includes(role)) return fail('Invalid role');
        await updateUserRole(userId, role);
        await logAdminAction(auth.user, 'user.role_changed', 'user', userId, `${target.role} → ${role}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users PATCH]', err.message);
        return fail(err.message, 500);
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { userId } = await req.json();
        if (!isUuid(userId)) return fail('A valid userId is required');
        if (userId === auth.user.id) return fail('You cannot delete your own account');

        const target = await loadTarget(userId);
        if (!target) return fail('User not found', 404);
        if (await isSuperAdminUser(userId)) return fail('Super admin accounts cannot be deleted', 403);
        if (target.role === 'admin' && !auth.user.isSuperAdmin) {
            return fail('Only a super admin can delete an admin', 403);
        }

        await deleteUser(userId);
        await logAdminAction(auth.user, 'user.deleted', 'user', userId, target.email);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users DELETE]', err.message);
        if (/foreign key|violates/i.test(err.message)) {
            return fail('This user has consultations on record and cannot be deleted. Suspend them instead.', 409);
        }
        return fail(err.message, 500);
    }
}