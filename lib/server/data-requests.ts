import { createAdminClient } from '@/lib/supabase/client';

export const REQUEST_TYPES = ['export', 'deletion', 'correction'] as const;
export const REQUEST_STATUSES = ['received', 'in_progress', 'completed', 'rejected'] as const;
const OPEN = ['received', 'in_progress'];

const db = () => createAdminClient() as any;
const FIELDS = 'id, user_id, requester_email, request_type, status, details, due_at, created_by_email, handled_by_email, completed_at, created_at';

export async function listDataRequests(o: { status?: string; q: string; from: number; to: number }) {
    const nowIso = new Date().toISOString();
    let query = db().from('data_requests').select(FIELDS, { count: 'exact' });
    const open = o.status === 'overdue' || o.status === 'received' || o.status === 'in_progress';

    if (o.status === 'overdue') query = query.in('status', OPEN).lt('due_at', nowIso);
    else if (o.status && (REQUEST_STATUSES as readonly string[]).includes(o.status)) query = query.eq('status', o.status);
    if (o.q) query = query.ilike('requester_email', `%${o.q}%`);
    query = open ? query.order('due_at', { ascending: true }) : query.order('created_at', { ascending: false });
    const { data, error, count } = await query.order('id').range(o.from, o.to);
    if (error) throw error;

    const head = (f?: (q: any) => any) => {
        let q = db().from('data_requests').select('id', { count: 'exact', head: true });
        if (f) q = f(q);
        return q;
    };
    const [all, received, inProgress, completed, rejected, overdue] = await Promise.all([
        head(), head((q) => q.eq('status', 'received')), head((q) => q.eq('status', 'in_progress')),
        head((q) => q.eq('status', 'completed')), head((q) => q.eq('status', 'rejected')),
        head((q) => q.in('status', OPEN).lt('due_at', nowIso)),
    ]);
    const n = (r: any) => r?.count ?? 0;
    return {
        data: data ?? [],
        total: count ?? 0,
        counts: { all: n(all), received: n(received), in_progress: n(inProgress), completed: n(completed), rejected: n(rejected), overdue: n(overdue) },
    };
}

export async function createDataRequest(
    o: { email: string; type: string; details?: string },
    adminUser: { id: string; email: string | null },
) {
    const email = o.email.trim().toLowerCase();
    // Link to an account when the email belongs to one
    const { data: account } = await db().from('users').select('id').eq('email', email).maybeSingle();
    const { data, error } = await db().from('data_requests').insert({
        user_id: account?.id ?? null,
        requester_email: email,
        request_type: o.type,
        details: o.details?.trim() || null,
        created_by: adminUser.id,
        created_by_email: adminUser.email,
    }).select(FIELDS).single();
    if (error) throw error;
    return data;
}

export async function updateDataRequestStatus(id: string, status: string, adminEmail: string | null) {
    const done = status === 'completed' || status === 'rejected';
    const { data, error } = await db().from('data_requests')
        .update({ status, handled_by_email: adminEmail, completed_at: done ? new Date().toISOString() : null })
        .eq('id', id).select(FIELDS).maybeSingle();
    if (error) throw error;
    return data;
}

export async function countOverdueDataRequests(): Promise<number> {
    const { count } = await db().from('data_requests').select('id', { count: 'exact', head: true })
        .in('status', OPEN).lt('due_at', new Date().toISOString());
    return count ?? 0;
}