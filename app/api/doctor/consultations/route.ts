import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, ownsDoctorId, getConsultationAccess, forbidden } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }
    if (!ownsDoctorId(auth.user, doctorId)) return forbidden();

    try {
        const { fetchConsultationsByDoctor, fetchDoctorProfileByUserId } = await import('@/lib/server/doctor-queries');
        // Resolve: doctorId might be auth user_id or doctor_profiles.id
        let resolvedId = doctorId;
        const profile = await fetchDoctorProfileByUserId(doctorId) as any;
        if (profile?.id) resolvedId = profile.id;
        const data = await fetchConsultationsByDoctor(resolvedId);

        const formatted = data.map((row: any) => ({
            id: row.id,
            doctorId: row.doctor_id,
            patientId: row.patient_id,
            patientName: row.users?.name ?? 'Unknown',
            patientEmail: row.users?.email ?? '',
            patientAvatar: row.users?.avatar_url ?? '',
            status: row.status,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            durationMinutes: row.duration_minutes,
            notes: row.notes,
            summary: row.summary,
            isFollowUp: row.is_follow_up,
            followUpScheduledAt: row.follow_up_scheduled_at,
            created_at: row.created_at,
            // Structured note fields
            diagnosis: row.diagnosis ?? null,
            prescription: row.prescription ?? null,
            clinicalNotes: row.clinical_notes ?? null,
            chiefComplaint: row.chief_complaint ?? null,
            followUpPlan: row.follow_up_plan ?? null,
            outcome: row.outcome ?? null,
            followUpPriority: row.follow_up_priority ?? null,
        }));

        return NextResponse.json({ data: formatted });
    } catch (err: any) {
        console.error('[doctor/consultations GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    try {
        const body = await req.json();
        const { consultationId, status, notes, summary, outcome, followUpPriority,
            diagnosis, prescription, clinicalNotes, chiefComplaint, followUpPlan,
            isFollowUp, followUpScheduledAt, durationMinutes } = body;

        if (!consultationId || !status) {
            return NextResponse.json({ error: 'consultationId and status required' }, { status: 400 });
        }
        if (!['active', 'completed', 'missed', 'follow_up', 'waiting', 'cancelled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        const access = await getConsultationAccess(auth.user, consultationId);
        if (!access || (!access.asDoctor && !auth.user.isAdmin)) return forbidden();

        const { updateConsultationStatus } = await import('@/lib/server/doctor-queries');
        const updated = await updateConsultationStatus(consultationId, status, notes, summary, {
            outcome,
            follow_up_priority: followUpPriority,
            diagnosis,
            prescription,
            clinical_notes: clinicalNotes,
            chief_complaint: chiefComplaint,
            follow_up_plan: followUpPlan,
            is_follow_up: isFollowUp,
            follow_up_scheduled_at: followUpScheduledAt,
            duration_minutes: durationMinutes,
        });
        return NextResponse.json({ data: updated });
    } catch (err: any) {
        console.error('[doctor/consultations PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
