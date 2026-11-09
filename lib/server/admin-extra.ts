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

// ── Overview dashboard ───────────────────────────────────────
/**
 * Everything the Overview page needs, in ONE call:
 * what needs attention, headline numbers, a 7-day trend, and short "recent" lists.
 * Only cheap head-counts and tiny lists, so it stays fast as the data grows.
 */
export async function fetchOverview() {
    const admin: any = createAdminClient();
    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const yesterdayStart = todayStart.getTime() - 86_400_000;
    const weekAgo = iso(now - 7 * 86_400_000);
    const stuckBefore = iso(now - 6 * 3_600_000);

    const count = (table: string, f?: (q: any) => any) => {
        let q = admin.from(table).select('id', { count: 'exact', head: true });
        if (f) q = f(q);
        return q;
    };

    const [
        licenseReview, newMessages, lowReviews, stuck,
        totalUsers, usersWeek, doctorsLive, doctorsTotal,
        today, yesterday, active, waiting,
        trendRes, pendingList, recentConsults, recentActivity,
    ] = await Promise.all([
        count('doctor_credentials', (q) => q.eq('status', 'pending')),
        count('contact_messages', (q) => q.eq('status', 'new')),
        count('reviews', (q) => q.lte('rating', 2).eq('is_published', true).gte('created_at', weekAgo)),
        count('consultations', (q) => q.in('status', ['active', 'waiting']).lt('created_at', stuckBefore)),
        count('users'),
        count('users', (q) => q.gte('created_at', weekAgo)),
        count('doctor_profiles', (q) => q.eq('is_verified', true).eq('is_published', true)),
        count('doctor_profiles'),
        count('consultations', (q) => q.gte('created_at', iso(todayStart.getTime()))),
        count('consultations', (q) => q.gte('created_at', iso(yesterdayStart)).lt('created_at', iso(todayStart.getTime()))),
        count('consultations', (q) => q.eq('status', 'active')),
        count('consultation_queue', (q) => q.eq('status', 'waiting')),
        admin.rpc('admin_analytics', { p_days: 7 }),
        admin.from('doctor_profiles')
            .select('id, specialty, hospital, created_at, users!user_id(name), doctor_credentials(status)')
            .eq('is_verified', false).order('created_at', { ascending: false }).limit(5),
        admin.from('consultations')
            .select('id, status, created_at, users!patient_id(name), doctor_profiles!doctor_id(users!user_id(name))')
            .order('created_at', { ascending: false }).limit(6),
        admin.from('admin_audit_log')
            .select('id, admin_email, action, details, created_at')
            .order('created_at', { ascending: false }).limit(6),
    ]);

    // A missing table (feature not set up yet) just counts as 0 instead of breaking the page
    const n = (r: any) => r?.count ?? 0;

    return {
        generatedAt: new Date().toISOString(),
        attention: {
            licenseReview: n(licenseReview),
            newMessages: n(newMessages),
            lowReviews: n(lowReviews),
            stuckConsultations: n(stuck),
        },
        kpis: {
            totalUsers: n(totalUsers),
            usersThisWeek: n(usersWeek),
            doctorsLive: n(doctorsLive),
            doctorsTotal: n(doctorsTotal),
            consultationsToday: n(today),
            consultationsYesterday: n(yesterday),
            activeNow: n(active),
            waitingNow: n(waiting),
        },
        trend: (trendRes?.data?.series ?? []) as { day: string; users: number; consultations: number; completed: number }[],
        pendingDoctors: (pendingList?.data ?? []).map((d: any) => ({
            id: d.id,
            name: d.users?.name ?? 'Unknown',
            specialty: d.specialty,
            hospital: d.hospital,
            createdAt: d.created_at,
            license: (d.doctor_credentials?.status as 'pending' | 'rejected' | 'approved' | undefined) ?? 'none',
        })),
        recentConsultations: (recentConsults?.data ?? []).map((c: any) => ({
            id: c.id,
            status: c.status,
            createdAt: c.created_at,
            patientName: c.users?.name ?? 'Unknown',
            doctorName: c.doctor_profiles?.users?.name ?? 'Unknown',
        })),
        recentActivity: recentActivity?.data ?? [],
    };
}