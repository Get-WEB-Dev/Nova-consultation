/**
 * Nova Health — Admin Server Queries
 * Used by /api/admin/* routes
 *
 * Updated to use the new role-specific tables (patients, admins)
 * while maintaining backward compatibility with the shared users table.
 */

import { createAdminClient } from '@/lib/supabase/client';

// ── Fetch all users ───────────────────────────────────────────
export async function fetchAllUsers() {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('users')
        .select('id, name, email, phone, role, avatar_url, is_suspended, suspended_reason, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Fetch all patients with their profile data ────────────────
export async function fetchAllPatients() {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('patients')
        .select('*, users(id, name, email, avatar_url, role, created_at)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Fetch all admins ──────────────────────────────────────────
export async function fetchAllAdmins() {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('admins')
        .select('*, users(id, name, email, avatar_url, role, created_at)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Fetch all doctor profiles with user info ──────────────────
export async function fetchAllDoctors() {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('doctor_profiles')
        .select('*, users(name, email, avatar_url), doctor_credentials(status)')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Stats for admin dashboard ─────────────────────────────────
export async function fetchAdminStats() {
    const admin = createAdminClient();

    const [usersRes, patientsRes, doctorsRes, adminsRes, consultsRes, postsRes] = await Promise.all([
        admin.from('users').select('*', { count: 'exact', head: true }),
        admin.from('patients').select('*', { count: 'exact', head: true }),
        admin.from('doctor_profiles').select('*', { count: 'exact', head: true }),
        admin.from('admins').select('*', { count: 'exact', head: true }),
        admin.from('consultations').select('*', { count: 'exact', head: true }),
        admin.from('blog_posts').select('*', { count: 'exact', head: true }),
    ]);

    return {
        totalUsers: usersRes.count ?? 0,
        totalPatients: patientsRes.count ?? 0,
        totalDoctors: doctorsRes.count ?? 0,
        totalAdmins: adminsRes.count ?? 0,
        totalConsultations: consultsRes.count ?? 0,
        totalPosts: postsRes.count ?? 0,
    };
}

// ── Update user role ──────────────────────────────────────────
// Updates the role on the shared users table AND ensures the
// corresponding role-specific profile exists.
export async function updateUserRole(userId: string, role: string) {
    const admin = createAdminClient();

    // Update shared users table
    const { error } = await admin
        .from('users')
        .update({ role } as never)
        .eq('id', userId);
    if (error) throw error;

    // Update auth.users metadata
    await admin.auth.admin.updateUserById(userId, {
        user_metadata: { role: role === 'patient' ? 'user' : role },
    });

    // Ensure role-specific profile exists
    if (role === 'patient') {
        await admin.from('patients').upsert(
            { user_id: userId } as never,
            { onConflict: 'user_id', ignoreDuplicates: true }
        );
    } else if (role === 'admin') {
        await admin.from('admins').upsert(
            { user_id: userId, permissions: ['all'], is_super_admin: false } as never,
            { onConflict: 'user_id', ignoreDuplicates: true }
        );
    }
    // A user who is no longer an admin must also lose their `admins` row,
    // because getAuthUser() grants admin rights if EITHER the role is
    // 'admin' OR a row exists in `admins`.
    if (role !== 'admin') {
        await admin.from('admins').delete().eq('user_id', userId);
    }
}

// ── Delete user ───────────────────────────────────────────────
export async function deleteUser(userId: string) {
    const admin = createAdminClient();
    // Delete from public.users (cascades handle patients, admins, etc.)
    const { error } = await admin
        .from('users')
        .delete()
        .eq('id', userId);
    if (error) throw error;
    // Also delete from auth.users
    await admin.auth.admin.deleteUser(userId);
}

// ── Toggle doctor published status ────────────────────────────
export async function toggleDoctorPublished(doctorId: string, isPublished: boolean) {
    const admin: any = createAdminClient();
    if (isPublished) {
        const { data } = await admin.from('doctor_profiles').select('is_verified').eq('id', doctorId).maybeSingle();
        if (!data?.is_verified) throw new Error('Verify the doctor before publishing their profile');
    }
    const { error } = await admin.from('doctor_profiles').update({ is_published: isPublished }).eq('id', doctorId);
    if (error) throw error;
}

// ── Toggle doctor verified status ─────────────────────────────
// When verifying a doctor, also auto-publish them so they appear
// in public listings immediately. When un-verifying, also unpublish.
export async function toggleDoctorVerified(doctorId: string, isVerified: boolean) {
    const admin = createAdminClient();
    const updatePayload: Record<string, boolean> = { is_verified: isVerified };
    // Auto-publish when verifying, auto-unpublish when un-verifying
    updatePayload.is_published = isVerified;
    const { error } = await admin
        .from('doctor_profiles')
        .update(updatePayload as never)
        .eq('id', doctorId);
    if (error) throw error;
}

// ── Fetch all consultations ───────────────────────────────────
export async function fetchAllConsultations() {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data ?? [];
}

// ── Check if user is admin ────────────────────────────────────
export async function isUserAdmin(userId: string): Promise<boolean> {
    const admin = createAdminClient();
    const { data } = await admin
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
    return !!data;
}

// ── Get admin profile ─────────────────────────────────────────
export async function fetchAdminProfile(userId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('admins')
        .select('*, users(name, email, avatar_url)')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}


// ── Overview for the admin home page ──────────────────────────
export async function fetchAdminOverview() {
    const admin: any = createAdminClient();

    // Start of the day 6 days ago (UTC) → gives us a 7-day window
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 6);
    since.setUTCHours(0, 0, 0, 0);

    // Helper: count rows, optionally with a filter
    const count = (table: string, filter?: (q: any) => any) => {
        let q = admin.from(table).select('*', { count: 'exact', head: true });
        if (filter) q = filter(q);
        return q;
    };

    const [
        users, patients, doctors, pendingDocs, consults, activeConsults,
        completedConsults, posts, waiting,
        recentUsers, recentConsults, pendingList, usersWeek, consultsWeek,
    ] = await Promise.all([
        count('users'),
        count('patients'),
        count('doctor_profiles'),
        count('doctor_profiles', (q) => q.eq('is_verified', false)),
        count('consultations'),
        count('consultations', (q) => q.eq('status', 'active')),
        count('consultations', (q) => q.eq('status', 'completed')),
        count('blog_posts'),
        count('consultation_queue', (q) => q.eq('status', 'waiting')),
        admin.from('users').select('id, name, email, role, created_at')
            .order('created_at', { ascending: false }).limit(5),
        admin.from('consultations')
            .select('id, status, created_at, users!patient_id(name), doctor_profiles!doctor_id(users!user_id(name))')
            .order('created_at', { ascending: false }).limit(6),
        admin.from('doctor_profiles')
            .select('id, specialty, hospital, created_at, users!user_id(name, email)')
            .eq('is_verified', false).order('created_at', { ascending: false }).limit(5),
        admin.from('users').select('created_at').gte('created_at', since.toISOString()),
        admin.from('consultations').select('created_at').gte('created_at', since.toISOString()),
    ]);

    // Turn raw rows into "how many per day" for the last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        return d.toISOString().slice(0, 10);
    });
    const perDay = (rows: any[] | null) =>
        days.map((day) => (rows ?? []).filter((r) => String(r.created_at).slice(0, 10) === day).length);

    return {
        stats: {
            totalUsers: users.count ?? 0,
            totalPatients: patients.count ?? 0,
            totalDoctors: doctors.count ?? 0,
            pendingDoctors: pendingDocs.count ?? 0,
            totalConsultations: consults.count ?? 0,
            activeConsultations: activeConsults.count ?? 0,
            completedConsultations: completedConsults.count ?? 0,
            totalPosts: posts.count ?? 0,
            waitingInQueue: waiting.count ?? 0,
        },
        series: { days, users: perDay(usersWeek.data), consultations: perDay(consultsWeek.data) },
        recentUsers: recentUsers.data ?? [],
        recentConsultations: (recentConsults.data ?? []).map((c: any) => ({
            id: c.id,
            status: c.status,
            createdAt: c.created_at,
            patientName: c.users?.name ?? 'Unknown',
            doctorName: c.doctor_profiles?.users?.name ?? 'Unknown',
        })),
        pendingDoctors: (pendingList.data ?? []).map((d: any) => ({
            id: d.id,
            name: d.users?.name ?? 'Unknown',
            email: d.users?.email ?? '',
            specialty: d.specialty,
            hospital: d.hospital,
            createdAt: d.created_at,
        })),
    };
}


// ── Consultations monitor ─────────────────────────────────────
export async function fetchAdminConsultations() {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('consultations')
        .select('id, status, created_at, started_at, ended_at, duration_minutes, patient_rating, is_follow_up, users!patient_id(name, email), doctor_profiles!doctor_id(specialty, users!user_id(name))')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return (data ?? []).map((c: any) => ({
        id: c.id,
        status: c.status,
        createdAt: c.created_at,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        durationMinutes: c.duration_minutes,
        rating: c.patient_rating,
        isFollowUp: c.is_follow_up,
        patientName: c.users?.name ?? 'Unknown',
        patientEmail: c.users?.email ?? '',
        doctorName: c.doctor_profiles?.users?.name ?? 'Unknown',
        specialty: c.doctor_profiles?.specialty ?? '',
    }));
}

// Lets an admin clear a stuck session. Only live sessions can be cancelled.
export async function adminCancelConsultation(consultationId: string) {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('consultations')
        .update({ status: 'cancelled' })
        .eq('id', consultationId)
        .in('status', ['active', 'waiting'])
        .select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Only active or waiting consultations can be cancelled');
    // Free the patient's queue spot too
    await admin.from('consultation_queue').update({ status: 'left' })
        .eq('consultation_id', consultationId).eq('status', 'waiting');
}

// ── Blog post moderation ──────────────────────────────────────
export async function fetchAdminPosts() {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('blog_posts')
        .select('id, title, slug, is_published, views, likes, comment_count, created_at, doctor_profiles!doctor_id(users!user_id(name))')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        isPublished: p.is_published,
        views: p.views,
        likes: p.likes,
        comments: p.comment_count,
        createdAt: p.created_at,
        author: p.doctor_profiles?.users?.name ?? 'Unknown',
    }));
}

export async function setPostPublished(postId: string, isPublished: boolean) {
    const admin: any = createAdminClient();
    const update: Record<string, unknown> = { is_published: isPublished };
    if (isPublished) update.published_at = new Date().toISOString();
    const { error } = await admin.from('blog_posts').update(update).eq('id', postId);
    if (error) throw error;
}

export async function deletePostById(postId: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('blog_posts').delete().eq('id', postId);
    if (error) throw error;
}


// ── Audit log: who did what ───────────────────────────────────
// Never throws: a logging problem must not break the admin's action.
export async function logAdminAction(
    adminUser: { id: string; email: string | null },
    action: string,
    targetType: string,
    targetId: string,
    details?: string,
) {
    try {
        const admin: any = createAdminClient();
        const { error } = await admin.from('admin_audit_log').insert({
            admin_id: adminUser.id,
            admin_email: adminUser.email,
            action,
            target_type: targetType,
            target_id: targetId,
            details: details ?? null,
        });
        if (error) console.warn('[audit] insert failed:', error.message);
    } catch (err: any) {
        console.warn('[audit] failed:', err?.message);
    }
}

export async function fetchAuditLog() {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('admin_audit_log')
        .select('id, admin_email, action, target_type, target_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
    if (error) throw error;
    return data ?? [];
}

// ── System health (for the Settings page) ─────────────────────
export async function checkSystemHealth() {
    const admin: any = createAdminClient();
    const started = Date.now();
    const db = await admin.from('users').select('id', { count: 'exact', head: true });
    const dbMs = Date.now() - started;
    const audit = await admin.from('admin_audit_log').select('id', { count: 'exact', head: true });
    return {
        database: { ok: !db.error, ms: dbMs, error: db.error?.message ?? null },
        auditLogTable: { ok: !audit.error },
        zoom: { ok: !!(process.env.ZOOM_SDK_KEY && process.env.ZOOM_SDK_SECRET) },
        serviceRoleKey: { ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    };
}

export async function isSuperAdminUser(userId: string): Promise<boolean> {
    const admin: any = createAdminClient();
    const { data } = await admin
        .from('admins').select('is_super_admin').eq('user_id', userId).maybeSingle();
    return !!data?.is_super_admin;
}

export async function setUserSuspended(userId: string, suspended: boolean, reason?: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('users').update({
        is_suspended: suspended,
        suspended_reason: suspended ? (reason ?? null) : null,
        suspended_at: suspended ? new Date().toISOString() : null,
    }).eq('id', userId);
    if (error) throw error;
    // Also block logins at the Supabase Auth level ('none' lifts the ban)
    await admin.auth.admin.updateUserById(userId, {
        ban_duration: suspended ? '876000h' : 'none',
    });
}

// ── Doctor credentials ────────────────────────────────────────
const CREDENTIAL_BUCKET = 'doctor-credentials';

export async function fetchDoctorCredentials(doctorId: string) {
    const admin: any = createAdminClient();
    const { data, error } = await admin
        .from('doctor_credentials').select('*').eq('doctor_id', doctorId).maybeSingle();
    if (error) throw error;
    return data as {
        license_number: string; license_authority: string | null; document_path: string;
        status: 'pending' | 'approved' | 'rejected'; rejection_reason: string | null; submitted_at: string;
    } | null;
}

// The bucket is private, so documents are only viewable through a link that expires.
export async function getCredentialDocumentUrl(path: string) {
    const admin: any = createAdminClient();
    const { data, error } = await admin.storage.from(CREDENTIAL_BUCKET).createSignedUrl(path, 120);
    if (error) throw error;
    return data.signedUrl as string;
}

async function notifyDoctor(userId: string, title: string, message: string) {
    const admin: any = createAdminClient();
    const { error } = await admin.from('notifications').insert({
        user_id: userId, type: 'system', title, message, action_url: '/doctor-dashboard/profile',
    });
    if (error) console.warn('[admin] notification failed:', error.message);
}

export async function approveDoctor(doctorId: string, adminId: string) {
    const admin: any = createAdminClient();
    const { data: doc } = await admin.from('doctor_profiles').select('user_id').eq('id', doctorId).maybeSingle();
    if (!doc) throw new Error('Doctor not found');
    const cred = await fetchDoctorCredentials(doctorId);
    if (!cred) throw new Error('This doctor has not submitted a medical license yet');

    const { error } = await admin.from('doctor_profiles')
        .update({ is_verified: true, is_published: true }).eq('id', doctorId);
    if (error) throw error;
    await admin.from('doctor_credentials').update({
        status: 'approved', rejection_reason: null,
        reviewed_at: new Date().toISOString(), reviewed_by: adminId,
    }).eq('doctor_id', doctorId);
    await notifyDoctor(doc.user_id, 'Your profile is approved',
        'Your credentials were verified. Your profile is now visible to patients.');
}

export async function rejectDoctor(doctorId: string, adminId: string, reason: string) {
    const admin: any = createAdminClient();
    const { data: doc } = await admin.from('doctor_profiles').select('user_id').eq('id', doctorId).maybeSingle();
    if (!doc) throw new Error('Doctor not found');

    const { error } = await admin.from('doctor_profiles')
        .update({ is_verified: false, is_published: false }).eq('id', doctorId);
    if (error) throw error;
    await admin.from('doctor_credentials').update({
        status: 'rejected', rejection_reason: reason,
        reviewed_at: new Date().toISOString(), reviewed_by: adminId,
    }).eq('doctor_id', doctorId);
    await notifyDoctor(doc.user_id, 'Credentials need attention',
        `We couldn't approve your profile yet: ${reason}`);
}