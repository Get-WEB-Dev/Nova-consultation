import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import {
    listUsers, exportUsers, updateUserRole, deleteUser, setUserSuspended,
    isSuperAdminUser, logAdminAction,
} from '@/lib/server/admin-queries';
import { parseListParams, toCsv, csvResponse, today } from '@/lib/server/admin-list';

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
        const { sp, q, from, to, wantsCsv } = parseListParams(req);
        const opts = {
            q,
            role: sp.get('role') ?? undefined,
            status: sp.get('status') ?? undefined,
        };

        if (wantsCsv) {
            const rows = await exportUsers(opts);
            // Exporting personal data is itself an auditable action
            await logAdminAction(auth.user, 'export.users', 'user', auth.user.id, `${rows.length} rows`);
            return csvResponse(
                toCsv(rows, [
                    { header: 'Name', value: (u) => u.name },
                    { header: 'Email', value: (u) => u.email },
                    { header: 'Phone', value: (u) => u.phone },
                    { header: 'Role', value: (u) => u.role },
                    { header: 'Suspended', value: (u) => (u.is_suspended ? 'yes' : 'no') },
                    { header: 'Joined', value: (u) => u.created_at },
                ]),
                `users-${today()}.csv`,
            );
        }

        return NextResponse.json(await listUsers({ ...opts, from, to }));
    } catch (err: any) {
        console.error('[admin/users GET]', err.message);
        return NextResponse.json({ data: [], total: 0, error: err.message }, { status: 500 });
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