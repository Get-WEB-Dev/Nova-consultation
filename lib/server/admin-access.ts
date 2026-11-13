import { createAdminClient } from '@/lib/supabase/client';
import { PRESETS } from '@/lib/admin-permissions';

export class AccessError extends Error {
    constructor(message: string, public status: number) { super(message); }
}

export async function countSuperAdmins(db: any = createAdminClient()): Promise<number> {
    const { count } = await db.from('admins').select('user_id', { count: 'exact', head: true }).eq('is_super_admin', true);
    return count ?? 0;
}

/**
 * Change one admin's access level.
 * - `preset` sets their permissions (see PRESETS).
 * - `superAdmin` grants or removes super-admin rights.
 * The last remaining super admin can never be demoted.
 */
export async function setAdminAccess(
    targetId: string,
    change: { preset?: string; superAdmin?: boolean },
    db: any = createAdminClient(),
) {
    let { data: row } = await db.from('admins').select('user_id, is_super_admin').eq('user_id', targetId).maybeSingle();

    if (!row) {
        // An admin whose role is 'admin' but who has no admins row yet (older accounts): create it
        const { data: u } = await db.from('users').select('id, role').eq('id', targetId).maybeSingle();
        if (!u || u.role !== 'admin') throw new AccessError('That person is not an admin', 404);
        const { error } = await db.from('admins').insert({ user_id: targetId, permissions: ['all'], is_super_admin: false });
        if (error) throw error;
        row = { user_id: targetId, is_super_admin: false };
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof change.superAdmin === 'boolean') {
        if (!change.superAdmin && row.is_super_admin && (await countSuperAdmins(db)) <= 1) {
            throw new AccessError('There must always be at least one super admin', 409);
        }
        update.is_super_admin = change.superAdmin;
        if (change.superAdmin) update.permissions = ['all'];
    }
    if (change.preset) {
        const preset = PRESETS[change.preset];
        if (!preset) throw new AccessError('Unknown access level', 400);
        update.permissions = preset.permissions;
    }

    const { error } = await db.from('admins').update(update).eq('user_id', targetId);
    if (error) throw error;
}