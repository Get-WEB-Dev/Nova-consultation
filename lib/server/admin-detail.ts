/**
 * Data for the admin "detail" pages (User 360, Doctor 360, Consultation),
 * plus internal notes, global search and the alerts bell.
 */
import { createAdminClient } from '@/lib/supabase/client';
import { countOverdueDataRequests } from '@/lib/server/data-requests';
import { isUuid } from '@/lib/server/auth';

const db = () => createAdminClient() as any;

const countOf = (table: string, f?: (q: any) => any) => {
    let q = db().from(table).select('id', { count: 'exact', head: true });
    if (f) q = f(q);
    return q;
};
const n = (r: any) => r?.count ?? 0;
const first = (v: any) => (Array.isArray(v) ? v[0] : v);

// ── User 360 ─────────────────────────────────────────────────
export async function getUserDetail(id: string) {
    const admin = db();
    const { data: user, error } = await admin
        .from('users')
        .select('id, name, email, phone, avatar_url, bio, role, is_suspended, suspended_reason, suspended_at, created_at, updated_at')
        .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!user) return null;

    const [doctorRes, adminRow] = await Promise.all([
        admin.from('doctor_profiles').select('id, specialty, hospital, is_verified, is_published, rating, review_count, fee').eq('user_id', id).maybeSingle(),
        admin.from('admins').select('is_super_admin').eq('user_id', id).maybeSingle(),
    ]);
    const doctor = doctorRes.data ?? null;

    const consultFilter = doctor ? `patient_id.eq.${id},doctor_id.eq.${doctor.id}` : `patient_id.eq.${id}`;
    const [asPatient, completedPatient, asDoctor, reviews, notifTotal, notifUnread, consults, notifs, audit] = await Promise.all([
        countOf('consultations', (q) => q.eq('patient_id', id)),
        countOf('consultations', (q) => q.eq('patient_id', id).eq('status', 'completed')),
        doctor ? countOf('consultations', (q) => q.eq('doctor_id', doctor.id)) : Promise.resolve({ count: 0 }),
        countOf('reviews', (q) => q.eq('patient_id', id)),
        countOf('notifications', (q) => q.eq('user_id', id)),
        countOf('notifications', (q) => q.eq('user_id', id).eq('read', false)),
        admin.from('consultations')
            .select('id, status, created_at, duration_minutes, patient_id, users!patient_id(name), doctor_profiles!doctor_id(specialty, users!user_id(name))')
            .or(consultFilter).order('created_at', { ascending: false }).limit(10),
        admin.from('notifications').select('id, type, title, message, read, created_at')
            .eq('user_id', id).order('created_at', { ascending: false }).limit(10),
        admin.from('admin_audit_log').select('id, admin_email, action, details, created_at')
            .eq('target_id', id).order('created_at', { ascending: false }).limit(20),
    ]);

    return {
        user: { ...user, isSuperAdmin: !!adminRow.data?.is_super_admin },
        doctor,
        stats: {
            consultationsAsPatient: n(asPatient),
            completedAsPatient: n(completedPatient),
            consultationsAsDoctor: n(asDoctor),
            reviewsWritten: n(reviews),
            notificationsTotal: n(notifTotal),
            notificationsUnread: n(notifUnread),
        },
        recentConsultations: (consults.data ?? []).map((c: any) => {
            const asPat = c.patient_id === id;
            return {
                id: c.id,
                status: c.status,
                createdAt: c.created_at,
                durationMinutes: c.duration_minutes,
                role: asPat ? 'patient' : 'doctor',
                counterparty: asPat ? (c.doctor_profiles?.users?.name ?? 'Unknown') : (c.users?.name ?? 'Unknown'),
                specialty: c.doctor_profiles?.specialty ?? '',
            };
        }),
        notifications: notifs.data ?? [],
        audit: audit.data ?? [],
    };
}

/** Sensitive: only returned through the reason-gated /api/admin/reveal endpoint. */
export async function getUserMedical(id: string) {
    const admin = db();
    const [u, p] = await Promise.all([
        admin.from('users').select('dob, blood_type, allergies, emergency_contact').eq('id', id).maybeSingle(),
        admin.from('patients')
            .select('dob, phone, blood_type, allergies, emergency_contact, medical_history, insurance_provider, insurance_id, preferred_language')
            .eq('user_id', id).maybeSingle(),
    ]);
    if (!u.data && !p.data) return null;
    const a = u.data ?? {};
    const b = p.data ?? {};
    return {
        dob: b.dob ?? a.dob ?? null,
        bloodType: b.blood_type ?? a.blood_type ?? null,
        allergies: b.allergies ?? a.allergies ?? null,
        emergencyContact: b.emergency_contact ?? a.emergency_contact ?? null,
        medicalHistory: b.medical_history ?? null,
        insuranceProvider: b.insurance_provider ?? null,
        insuranceId: b.insurance_id ?? null,
        preferredLanguage: b.preferred_language ?? null,
    };
}

/** Sensitive: a copy of one person's account data. Only through /api/admin/reveal. Chat content is excluded. */
export async function getUserExport(id: string) {
    const admin = db();
    const [user, patient, doctor, consults, reviews, notifs, saved] = await Promise.all([
        admin.from('users').select('*').eq('id', id).maybeSingle(),
        admin.from('patients').select('*').eq('user_id', id).maybeSingle(),
        admin.from('doctor_profiles').select('*').eq('user_id', id).maybeSingle(),
        admin.from('consultations')
            .select('id, status, created_at, started_at, ended_at, duration_minutes, patient_rating, is_follow_up')
            .eq('patient_id', id).order('created_at'),
        admin.from('reviews').select('*').eq('patient_id', id),
        admin.from('notifications').select('type, title, message, read, created_at').eq('user_id', id),
        admin.from('saved_doctors').select('*').eq('patient_id', id),
    ]);
    if (!user.data) return null;
    return {
        exportedAt: new Date().toISOString(),
        note: 'Chat message content is not included in this export.',
        user: user.data,
        patientRecord: patient.data ?? null,
        doctorProfile: doctor.data ?? null,
        consultations: consults.data ?? [],
        reviews: reviews.data ?? [],
        notifications: notifs.data ?? [],
        savedDoctors: saved.data ?? [],
    };
}

// ── Doctor 360 ───────────────────────────────────────────────
export async function getDoctorDetail(id: string) {
    const admin = db();
    const { data: dp, error } = await admin
        .from('doctor_profiles')
        .select('id, user_id, specialty, hospital, experience_years, rating, review_count, fee, languages, gender, consultation_type, status, location_city, consultation_duration_mins, is_verified, is_published, created_at, users!user_id(id, name, email, phone, avatar_url, is_suspended, created_at)')
        .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!dp) return null;

    const [metrics, cred, reviews, consults, posts, slots] = await Promise.all([
        admin.rpc('admin_doctor_metrics', { p_doctor: id }),
        admin.from('doctor_credentials')
            .select('license_number, license_authority, status, rejection_reason, submitted_at, reviewed_at').eq('doctor_id', id).maybeSingle(),
        admin.from('reviews')
            .select('id, rating, comment, is_published, created_at, users!patient_id(name)')
            .eq('doctor_id', id).order('created_at', { ascending: false }).limit(8),
        admin.from('consultations')
            .select('id, status, created_at, duration_minutes, patient_rating, users!patient_id(name)')
            .eq('doctor_id', id).order('created_at', { ascending: false }).limit(10),
        countOf('blog_posts', (q) => q.eq('doctor_id', id)),
        countOf('doctor_availability', (q) => q.eq('doctor_id', id).eq('is_active', true)),
    ]);

    const m = metrics.data ?? {};
    const completed = m.completed ?? 0;
    const total = m.total ?? 0;
    const u = first(dp.users) ?? {};

    return {
        doctor: {
            id: dp.id, userId: dp.user_id, name: u.name ?? 'Unknown', email: u.email ?? '', phone: u.phone ?? null,
            avatar: u.avatar_url ?? null, accountSuspended: !!u.is_suspended, memberSince: dp.created_at,
            specialty: dp.specialty, hospital: dp.hospital, experienceYears: dp.experience_years,
            fee: Number(dp.fee ?? 0), languages: dp.languages ?? [], gender: dp.gender, consultationType: dp.consultation_type,
            status: dp.status, city: dp.location_city, slotMinutes: dp.consultation_duration_mins,
            isVerified: dp.is_verified, isPublished: dp.is_published,
        },
        metrics: {
            total, completed,
            missed: m.missed ?? 0,
            cancelled: m.cancelled ?? 0,
            completionRate: total ? Math.round((completed / total) * 100) : null,
            avgDuration: m.avg_duration ?? null,
            avgRating: m.avg_rating ?? null,
            uniquePatients: m.unique_patients ?? 0,
            last30d: m.last_30d ?? 0,
            // There is no payments table yet, so this is fee × completed sessions, not real revenue
            estimatedValue: Math.round(Number(dp.fee ?? 0) * completed),
            blogPosts: n(posts),
            activeSlots: n(slots),
        },
        credentials: cred.data ?? null,
        reviews: (reviews.data ?? []).map((r: any) => ({
            id: r.id, rating: r.rating, comment: r.comment, isPublished: r.is_published,
            createdAt: r.created_at, patient: first(r.users)?.name ?? 'Unknown',
        })),
        recentConsultations: (consults.data ?? []).map((c: any) => ({
            id: c.id, status: c.status, createdAt: c.created_at, durationMinutes: c.duration_minutes,
            rating: c.patient_rating, patient: first(c.users)?.name ?? 'Unknown',
        })),
    };
}

// ── Consultation detail ──────────────────────────────────────
export async function getConsultationDetail(id: string) {
    const admin = db();
    const { data: c, error } = await admin
        .from('consultations')
        .select('id, status, is_follow_up, follow_up_scheduled_at, follow_up_priority, outcome, started_at, ended_at, duration_minutes, patient_rating, created_at, updated_at, patient_id, doctor_id, users!patient_id(id, name, email), doctor_profiles!doctor_id(id, specialty, fee, user_id, users!user_id(name))')
        .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!c) return null;

    const [review, msgTotal, msgFiles, msgPatient, msgDoctor, hasNotes] = await Promise.all([
        db().from('reviews').select('rating, comment, is_published, created_at').eq('consultation_id', id).maybeSingle(),
        countOf('messages', (q) => q.eq('consultation_id', id).is('deleted_at', null)),
        countOf('messages', (q) => q.eq('consultation_id', id).is('deleted_at', null).not('attachment_url', 'is', null)),
        countOf('messages', (q) => q.eq('consultation_id', id).is('deleted_at', null).eq('sender_role', 'patient')),
        countOf('messages', (q) => q.eq('consultation_id', id).is('deleted_at', null).eq('sender_role', 'doctor')),
        countOf('consultations', (q) => q.eq('id', id).not('diagnosis', 'is', null)),
    ]);

    const patient = first(c.users) ?? {};
    const dp = first(c.doctor_profiles) ?? {};
    return {
        id: c.id,
        status: c.status,
        isFollowUp: c.is_follow_up,
        followUpScheduledAt: c.follow_up_scheduled_at,
        followUpPriority: c.follow_up_priority,
        outcome: c.outcome,
        createdAt: c.created_at,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        updatedAt: c.updated_at,
        durationMinutes: c.duration_minutes,
        rating: c.patient_rating,
        patient: { id: patient.id ?? c.patient_id, name: patient.name ?? 'Unknown', email: patient.email ?? '' },
        doctor: { id: dp.id ?? c.doctor_id, userId: dp.user_id ?? null, name: first(dp.users)?.name ?? 'Unknown', specialty: dp.specialty ?? '', fee: Number(dp.fee ?? 0) },
        review: review.data ? { rating: review.data.rating, comment: review.data.comment, isPublished: review.data.is_published, createdAt: review.data.created_at } : null,
        messages: { total: n(msgTotal), attachments: n(msgFiles), fromPatient: n(msgPatient), fromDoctor: n(msgDoctor) },
        clinicalNotesRecorded: n(hasNotes) > 0,
    };
}

/** Sensitive: only returned through the reason-gated /api/admin/reveal endpoint. */
export async function getConsultationClinical(id: string) {
    const { data } = await db().from('consultations')
        .select('chief_complaint, symptoms, duration_description, diagnosis, prescription, clinical_notes, summary, follow_up_plan, notes')
        .eq('id', id).maybeSingle();
    if (!data) return null;
    return {
        chiefComplaint: data.chief_complaint, symptoms: data.symptoms, durationDescription: data.duration_description,
        diagnosis: data.diagnosis, prescription: data.prescription, clinicalNotes: data.clinical_notes,
        summary: data.summary, followUpPlan: data.follow_up_plan, notes: data.notes,
    };
}

/**
 * Records that an admin opened sensitive data. Unlike logAdminAction this THROWS
 * when it cannot write, so the data is never shown without a record.
 */
export async function logSensitiveAccess(
    adminUser: { id: string; email: string | null },
    action: string, targetType: string, targetId: string, reason: string,
) {
    const { error } = await db().from('admin_audit_log').insert({
        admin_id: adminUser.id, admin_email: adminUser.email,
        action, target_type: targetType, target_id: targetId, details: reason,
    });
    if (error) throw new Error('Could not record this access, so nothing was shown.');
}

// ── Internal notes ───────────────────────────────────────────
export const NOTE_ENTITIES = ['user', 'doctor', 'consultation', 'message'] as const;
export type NoteEntity = (typeof NOTE_ENTITIES)[number];

export async function listNotes(entityType: NoteEntity, entityId: string) {
    const { data, error } = await db().from('admin_notes')
        .select('id, admin_id, admin_email, note, created_at')
        .eq('entity_type', entityType).eq('entity_id', entityId)
        .order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data ?? [];
}

export async function addNote(entityType: NoteEntity, entityId: string, adminUser: { id: string; email: string | null }, note: string) {
    const { data, error } = await db().from('admin_notes')
        .insert({ entity_type: entityType, entity_id: entityId, admin_id: adminUser.id, admin_email: adminUser.email, note })
        .select('id, admin_id, admin_email, note, created_at').single();
    if (error) throw error;
    return data;
}

export async function getNote(noteId: string) {
    const { data } = await db().from('admin_notes').select('id, admin_id, entity_type, entity_id').eq('id', noteId).maybeSingle();
    return data as { id: string; admin_id: string | null; entity_type: string; entity_id: string } | null;
}

export async function deleteNote(noteId: string) {
    const { error } = await db().from('admin_notes').delete().eq('id', noteId);
    if (error) throw error;
}

// ── Global search (⌘K) ───────────────────────────────────────
export interface SearchHit { type: 'user' | 'doctor' | 'consultation' | 'message'; id: string; title: string; subtitle: string; href: string }

export async function globalSearch(q: string): Promise<SearchHit[]> {
    if (q.length < 2) return [];
    const admin = db();
    const base = '/admin-dashboard';

    const [users, docsBySpec, docsByName, messages, consult] = await Promise.all([
        admin.from('users').select('id, name, email, role, is_suspended').or(`name.ilike.%${q}%,email.ilike.%${q}%`).limit(6),
        admin.from('doctor_profiles').select('id, specialty, hospital, users!user_id(name)').or(`specialty.ilike.%${q}%,hospital.ilike.%${q}%`).limit(4),
        admin.from('doctor_profiles').select('id, specialty, hospital, users!user_id!inner(name)').ilike('users.name', `%${q}%`).limit(4),
        admin.from('contact_messages').select('id, name, email, subject, status').or(`name.ilike.%${q}%,email.ilike.%${q}%,subject.ilike.%${q}%`).limit(4),
        isUuid(q)
            ? admin.from('consultations').select('id, status, created_at').eq('id', q).limit(1)
            : Promise.resolve({ data: [] }),
    ]);

    const hits: SearchHit[] = [];
    for (const u of users.data ?? []) {
        hits.push({ type: 'user', id: u.id, title: u.name, subtitle: `${u.email} · ${u.role}${u.is_suspended ? ' · suspended' : ''}`, href: `${base}/users/${u.id}` });
    }
    const seen = new Set<string>();
    for (const d of [...(docsByName.data ?? []), ...(docsBySpec.data ?? [])]) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        hits.push({ type: 'doctor', id: d.id, title: `Dr. ${String(first(d.users)?.name ?? 'Unknown').replace(/^dr\.?\s*/i, '')}`, subtitle: `${d.specialty}${d.hospital ? ` · ${d.hospital}` : ''}`, href: `${base}/doctors/${d.id}` });
    }
    for (const c of consult.data ?? []) {
        hits.push({ type: 'consultation', id: c.id, title: `Consultation ${String(c.id).slice(0, 8)}`, subtitle: `${c.status} · ${new Date(c.created_at).toLocaleDateString()}`, href: `${base}/consultations/${c.id}` });
    }
    for (const m of messages.data ?? []) {
        hits.push({ type: 'message', id: m.id, title: m.subject || '(no subject)', subtitle: `${m.name} · ${m.email} · ${m.status}`, href: `${base}/messages` });
    }
    return hits;
}

// ── Alerts bell ──────────────────────────────────────────────
export async function fetchAttention() {
    const iso = (ms: number) => new Date(ms).toISOString();
    const [licenses, messages, lowReviews, stuck, overdueRequests] = await Promise.all([
        countOf('doctor_credentials', (q) => q.eq('status', 'pending')),
        countOf('contact_messages', (q) => q.eq('status', 'new')),
        countOf('reviews', (q) => q.lte('rating', 2).eq('is_published', true).gte('created_at', iso(Date.now() - 7 * 86_400_000))),
        countOf('consultations', (q) => q.in('status', ['active', 'waiting']).lt('created_at', iso(Date.now() - 6 * 3_600_000))),
        countOverdueDataRequests().catch(() => 0),
    ]);
    const items = [
        { key: 'stuck', label: 'Consultations stuck over 6 hours', count: n(stuck), href: '/admin-dashboard/consultations' },
        { key: 'licenses', label: 'Doctor licenses to review', count: n(licenses), href: '/admin-dashboard/doctors' },
        { key: 'privacy', label: 'Overdue data requests', count: overdueRequests, href: '/admin-dashboard/data-requests' },
        { key: 'messages', label: 'New contact messages', count: n(messages), href: '/admin-dashboard/messages' },
        { key: 'reviews', label: 'Low-rated reviews this week', count: n(lowReviews), href: '/admin-dashboard/reviews' },
    ].filter((i) => i.count > 0);
    return { total: items.reduce((s, i) => s + i.count, 0), items };
}