/**
 * GET /api/doctor/patients/:id — a patient's chart, as seen by THEIR treating doctor:
 * profile, medical background, and the visits between this doctor and this patient.
 * (Other doctors' consultations with the same patient are never included.)
 */
import { NextResponse } from 'next/server';
import { requireUser, forbidden, isUuid, doctorHasPatient } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const profileId = auth.user.doctorProfileId;
    if (!profileId || !isUuid(params.id)) return forbidden();
    if (!(await doctorHasPatient(profileId, params.id))) return forbidden('This patient is not in your care.');

    try {
        const admin: any = createAdminClient();
        const [userRes, patientRes, consRes, convRes] = await Promise.all([
            admin.from('users').select('id, name, email, avatar_url, phone, created_at').eq('id', params.id).maybeSingle(),
            admin.from('patients').select('dob, phone, blood_type, allergies, emergency_contact, medical_history, insurance_provider, preferred_language').eq('user_id', params.id).maybeSingle(),
            admin.from('consultations')
                .select('id, status, is_follow_up, follow_up_scheduled_at, follow_up_priority, started_at, ended_at, duration_minutes, chief_complaint, diagnosis, prescription, outcome, created_at')
                .eq('doctor_id', profileId).eq('patient_id', params.id)
                .order('created_at', { ascending: false }).limit(300),
            admin.from('conversations').select('id').eq('doctor_id', profileId).eq('patient_id', params.id).maybeSingle(),
        ]);
        if (!userRes.data) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

        const rows: any[] = consRes.data ?? [];
        const seen = rows.filter((r) => r.status === 'completed' || r.status === 'follow_up');
        const durations = seen.map((r) => r.duration_minutes).filter((n) => typeof n === 'number' && n > 0);
        const pending = rows.find((r) => r.status === 'follow_up' && r.follow_up_scheduled_at);
        const oldest = seen.length ? seen[seen.length - 1] : null;

        return NextResponse.json({
            data: {
                patient: {
                    id: userRes.data.id,
                    name: userRes.data.name,
                    email: userRes.data.email,
                    avatar: userRes.data.avatar_url,
                    phone: patientRes.data?.phone ?? userRes.data.phone ?? null,
                    dob: patientRes.data?.dob ?? null,
                    language: patientRes.data?.preferred_language ?? null,
                    memberSince: userRes.data.created_at,
                },
                medical: {
                    bloodType: patientRes.data?.blood_type ?? null,
                    allergies: patientRes.data?.allergies ?? null,
                    history: patientRes.data?.medical_history ?? null,
                    emergencyContact: patientRes.data?.emergency_contact ?? null,
                    insurance: patientRes.data?.insurance_provider ?? null,
                },
                stats: {
                    visits: seen.length,
                    missed: rows.filter((r) => r.status === 'missed').length,
                    firstVisit: oldest?.created_at ?? null,
                    lastVisit: seen[0]?.created_at ?? null,
                    avgDuration: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
                    pendingFollowUp: pending ? { consultationId: pending.id, scheduledAt: pending.follow_up_scheduled_at, priority: pending.follow_up_priority } : null,
                },
                consultations: rows.map((r) => ({
                    id: r.id, status: r.status, createdAt: r.created_at, durationMinutes: r.duration_minutes,
                    isFollowUp: r.is_follow_up, chiefComplaint: r.chief_complaint, diagnosis: r.diagnosis,
                    prescription: r.prescription, outcome: r.outcome,
                })),
                conversationId: convRes.data?.id ?? null,
            },
        });
    } catch (err: any) {
        console.error('[doctor/patients/:id GET]', err.message);
        return NextResponse.json({ error: 'Could not load this patient' }, { status: 500 });
    }
}