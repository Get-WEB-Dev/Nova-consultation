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
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('users')
        .select('*')
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
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('doctor_profiles')
        .select('*, users(name, email, avatar_url)')
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
    const admin = createAdminClient();
    const { error } = await admin
        .from('doctor_profiles')
        .update({ is_published: isPublished } as never)
        .eq('id', doctorId);
    if (error) throw error;
}

// ── Toggle doctor verified status ─────────────────────────────
export async function toggleDoctorVerified(doctorId: string, isVerified: boolean) {
    const admin = createAdminClient();
    const { error } = await admin
        .from('doctor_profiles')
        .update({ is_verified: isVerified } as never)
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
