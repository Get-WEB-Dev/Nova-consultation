/**
 * Nova Health — Doctor-specific Server Queries
 * Used by /api/doctor/* routes
 */

import { createAdminClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type ConsultRow = Database['public']['Tables']['consultations']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

// ── Get doctor profile by user_id ─────────────────────────────
export async function fetchDoctorProfileByUserId(userId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('doctor_profiles')
        .select('*, users(name, email, avatar_url)')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// ── Consultations for a doctor ────────────────────────────────
export async function fetchConsultationsByDoctor(doctorId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('consultations')
        .select('*, users!patient_id(name, email, avatar_url)')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Patients seen by a doctor ─────────────────────────────────
export async function fetchDoctorPatients(doctorId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('consultations')
        .select('patient_id, users!patient_id(id, name, email, avatar_url, phone, dob, role, created_at)')
        .eq('doctor_id', doctorId);
    if (error) throw error;

    // Deduplicate patients
    const seen = new Set<string>();
    const patients: any[] = [];
    for (const row of (data as any[]) ?? []) {
        if (!seen.has(row.patient_id)) {
            seen.add(row.patient_id);
            patients.push((row as any).users);
        }
    }
    return patients;
}

// ── Queue for the doctor ──────────────────────────────────────
export async function fetchDoctorQueue(doctorId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('consultation_queue')
        .select('*, users!patient_id(name, avatar_url)')
        .eq('doctor_id', doctorId)
        .eq('status', 'waiting')
        .order('queue_position', { ascending: true });
    if (error) throw error;
    return data ?? [];
}

// ── Update consultation status ────────────────────────────────
export async function updateConsultationStatus(
    consultationId: string,
    status: string,
    notes?: string,
    summary?: string
) {
    const admin = createAdminClient();
    const update: any = { status };
    if (notes !== undefined) update.notes = notes;
    if (summary !== undefined) update.summary = summary;
    if (status === 'active') update.started_at = new Date().toISOString();
    if (status === 'completed') update.ended_at = new Date().toISOString();

    const { data, error } = await admin
        .from('consultations')
        .update(update as never)
        .eq('id', consultationId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ── Update doctor status ──────────────────────────────────────
export async function updateDoctorStatus(doctorId: string, status: string) {
    const admin = createAdminClient();
    const { error } = await admin
        .from('doctor_profiles')
        .update({ status } as never)
        .eq('id', doctorId);
    if (error) throw error;
}

// ── Update doctor profile ─────────────────────────────────────
export async function updateDoctorProfile(doctorId: string, updates: Partial<Database['public']['Tables']['doctor_profiles']['Update']>) {
    const admin = createAdminClient();
    const { error } = await admin
        .from('doctor_profiles')
        .update(updates as never)
        .eq('id', doctorId);
    if (error) throw error;
}
