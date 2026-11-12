/**
 * GET /api/doctor/consultations/:id — the full record of ONE consultation.
 * Only the consultation's own doctor (or an admin) can read it.
 */
import { NextResponse } from 'next/server';
import { requireUser, getConsultationAccess, forbidden } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;

    const access = await getConsultationAccess(auth.user, params.id);
    if (!access || (!access.asDoctor && !auth.user.isAdmin)) return forbidden();

    try {
        const admin: any = createAdminClient();
        const { data: c, error } = await admin.from('consultations').select('*').eq('id', params.id).maybeSingle();
        if (error) throw error;
        if (!c) return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

        const [userRes, patientRes, doctorRes, priorRes] = await Promise.all([
            admin.from('users').select('id, name, email, avatar_url, phone').eq('id', c.patient_id).maybeSingle(),
            admin.from('patients').select('dob, phone, blood_type, allergies, emergency_contact, medical_history, preferred_language').eq('user_id', c.patient_id).maybeSingle(),
            admin.from('doctor_profiles').select('specialty, hospital, users!user_id(name)').eq('id', c.doctor_id).maybeSingle(),
            // every visit between this doctor and this patient, to number this one and find the previous
            admin.from('consultations').select('id, created_at, diagnosis, status')
                .eq('doctor_id', c.doctor_id).eq('patient_id', c.patient_id).in('status', ['completed', 'follow_up'])
                .order('created_at', { ascending: true }).limit(500),
        ]);

        const visits: any[] = priorRes.data ?? [];
        const index = visits.findIndex((v) => v.id === c.id);
        const previous = [...visits].reverse().find((v) => new Date(v.created_at) < new Date(c.created_at)) ?? null;

        return NextResponse.json({
            data: {
                id: c.id,
                status: c.status,
                isFollowUp: c.is_follow_up,
                followUpScheduledAt: c.follow_up_scheduled_at,
                followUpPriority: c.follow_up_priority,
                followUpPlan: c.follow_up_plan,
                outcome: c.outcome,
                createdAt: c.created_at,
                startedAt: c.started_at,
                endedAt: c.ended_at,
                durationMinutes: c.duration_minutes,
                chiefComplaint: c.chief_complaint,
                symptoms: c.symptoms,
                symptomsDuration: c.duration_description,
                clinicalNotes: c.clinical_notes ?? c.notes,
                diagnosis: c.diagnosis,
                prescription: c.prescription,
                summary: c.summary,
                rating: c.patient_rating,
                visitNumber: index >= 0 ? index + 1 : null,
                totalVisits: visits.length,
                previousVisit: previous ? { id: previous.id, date: previous.created_at, diagnosis: previous.diagnosis } : null,
                patient: {
                    id: c.patient_id,
                    name: userRes.data?.name ?? 'Unknown patient',
                    email: userRes.data?.email ?? null,
                    avatar: userRes.data?.avatar_url ?? null,
                    phone: patientRes.data?.phone ?? userRes.data?.phone ?? null,
                    dob: patientRes.data?.dob ?? null,
                    bloodType: patientRes.data?.blood_type ?? null,
                    allergies: patientRes.data?.allergies ?? null,
                },
                doctor: {
                    name: doctorRes.data?.users?.name ?? null,
                    specialty: doctorRes.data?.specialty ?? null,
                    hospital: doctorRes.data?.hospital ?? null,
                },
            },
        });
    } catch (err: any) {
        console.error('[doctor/consultations/:id GET]', err.message);
        return NextResponse.json({ error: 'Could not load this consultation' }, { status: 500 });
    }
}