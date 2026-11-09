import { createAdminClient } from '@/lib/supabase/client';

type CountDefs = Record<string, ((q: any) => any) | null>;

/** Row counts for the filter chips, one cheap head-count per chip. */
async function countBy(table: string, defs: CountDefs) {
    const admin: any = createAdminClient();
    const keys = Object.keys(defs);
    const res = await Promise.all(keys.map((k) => {
        let q = admin.from(table).select('id', { count: 'exact', head: true });
        const f = defs[k];
        if (f) q = f(q);
        return q;
    }));
    return Object.fromEntries(keys.map((k, i) => [k, res[i].count ?? 0])) as Record<string, number>;
}

// ── Reviews ──────────────────────────────────────────────────
export async function listReviews(o: { q: string; status?: string; from: number; to: number }) {
    const admin: any = createAdminClient();
    let query = admin
        .from('reviews')
        .select('id, rating, comment, is_published, created_at, users!patient_id(name), doctor_profiles!doctor_id(specialty, users!user_id(name))', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id');
    if (o.status === 'published') query = query.eq('is_published', true);
    if (o.status === 'hidden') query = query.eq('is_published', false);
    if (o.status === 'low') query = query.lte('rating', 2);
    if (o.q) query = query.ilike('comment', `%${o.q}%`);
    const { data, error, count } = await query.range(o.from, o.to);
    if (error) throw error;

    const counts = await countBy('reviews', {
        all: null,
        published: (q) => q.eq('is_published', true),
        hidden: (q) => q.eq('is_published', false),
        low: (q) => q.lte('rating', 2),
    });
    return {
        total: count ?? 0,
        counts,
        data: (data ?? []).map((r: any) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            isPublished: r.is_published,
            createdAt: r.created_at,
            patient: r.users?.name ?? 'Unknown',
            doctor: r.doctor_profiles?.users?.name ?? 'Unknown',
            specialty: r.doctor_profiles?.specialty ?? '',
        })),
    };
}

export async function setReviewPublished(id: string, isPublished: boolean) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('reviews').update({ is_published: isPublished }).eq('id', id);
    if (error) throw error;
}

export async function deleteReview(id: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('reviews').delete().eq('id', id);
    if (error) throw error;
}

// ── Contact inbox ────────────────────────────────────────────
export async function listContactMessages(o: { q: string; status?: string; from: number; to: number }) {
    const admin: any = createAdminClient();
    let query = admin
        .from('contact_messages')
        .select('id, name, email, subject, message, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id');
    if (o.status && ['new', 'read', 'resolved'].includes(o.status)) query = query.eq('status', o.status);
    if (o.q) query = query.or(`name.ilike.%${o.q}%,email.ilike.%${o.q}%,subject.ilike.%${o.q}%`);
    const { data, error, count } = await query.range(o.from, o.to);
    if (error) throw error;

    const counts = await countBy('contact_messages', {
        all: null,
        new: (q) => q.eq('status', 'new'),
        read: (q) => q.eq('status', 'read'),
        resolved: (q) => q.eq('status', 'resolved'),
    });
    return { data: data ?? [], total: count ?? 0, counts };
}

export async function setContactStatus(id: string, status: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('contact_messages').update({ status }).eq('id', id);
    if (error) throw error;
}

export async function deleteContactMessage(id: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('contact_messages').delete().eq('id', id);
    if (error) throw error;
}

// ── Announcements (system notifications) ─────────────────────
export async function sendAnnouncement(o: { audience: 'all' | 'patients' | 'doctors'; title: string; message: string }) {
    const admin: any = createAdminClient();
    const roles = o.audience === 'patients' ? ['patient'] : o.audience === 'doctors' ? ['doctor', 'professional'] : null;
    let sent = 0;
    for (let from = 0; from < 50000; from += 1000) {
        let q = admin.from('users').select('id').eq('is_suspended', false).order('id').range(from, from + 999);
        if (roles) q = q.in('role', roles);
        const { data, error } = await q;
        if (error) throw error;
        if (!data?.length) break;
        const rows = data.map((u: any) => ({ user_id: u.id, type: 'system', title: o.title, message: o.message }));
        const { error: insErr } = await admin.from('notifications').insert(rows);
        if (insErr) throw insErr;
        sent += rows.length;
        if (data.length < 1000) break;
    }
    return sent;
}

// ── Admin accounts ───────────────────────────────────────────
export async function listAdmins() {
    const admin: any = createAdminClient();
    const [byRole, byRow] = await Promise.all([
        admin.from('users').select('id, name, email, role, created_at').eq('role', 'admin'),
        admin.from('admins').select('user_id, is_super_admin, created_at, users(id, name, email, role)'),
    ]);
    if (byRole.error) throw byRole.error;
    if (byRow.error) throw byRow.error;

    const map = new Map<string, any>();
    for (const u of byRole.data ?? []) {
        map.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role, isSuperAdmin: false, since: u.created_at });
    }
    // Anyone with an `admins` row has admin access even if their role differs
    for (const a of byRow.data ?? []) {
        if (!a.users) continue;
        const cur = map.get(a.user_id) ?? { id: a.user_id, name: a.users.name, email: a.users.email, role: a.users.role, since: a.created_at };
        cur.isSuperAdmin = !!a.is_super_admin;
        map.set(a.user_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => Number(b.isSuperAdmin) - Number(a.isSuperAdmin));
}

// ── Analytics (computed by the admin_analytics() SQL function) ──
export async function fetchAnalytics(days: number) {
    const admin: any = createAdminClient();
    const { data, error } = await admin.rpc('admin_analytics', { p_days: days });
    if (error) throw error;
    return data;
}

// ── Blog posts (paged) ───────────────────────────────────────
export async function listPosts(o: { q: string; status?: string; from: number; to: number }) {
    const admin: any = createAdminClient();
    let query = admin
        .from('blog_posts')
        .select('id, title, slug, is_published, views, likes, comment_count, created_at, doctor_profiles!doctor_id(users!user_id(name))', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id');
    if (o.status === 'hidden') query = query.eq('is_published', false);
    if (o.q) query = query.ilike('title', `%${o.q}%`);
    const { data, error, count } = await query.range(o.from, o.to);
    if (error) throw error;
    return {
        total: count ?? 0,
        data: (data ?? []).map((p: any) => ({
            id: p.id, title: p.title, slug: p.slug, isPublished: p.is_published,
            views: p.views, likes: p.likes, comments: p.comment_count, createdAt: p.created_at,
            author: p.doctor_profiles?.users?.name ?? 'Unknown',
        })),
    };
}