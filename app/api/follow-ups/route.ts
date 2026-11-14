/**
 * Follow-Up API
 *
 * GET  /api/follow-ups?doctorId=<uuid>    — get follow-up consultations for a doctor
 * POST /api/follow-ups                    — mark a consultation as follow-up
 *      body: { consultationId, scheduledAt }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, ownsDoctorId, getConsultationAccess, forbidden } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ data: [], error: 'doctorId is required' }, { status: 400 });
    }
    if (!ownsDoctorId(auth.user, doctorId)) return forbidden();

    try {
        const { fetchFollowUps } = await import('@/lib/server/queries');
        const { fetchDoctorProfileByUserId } = await import('@/lib/server/doctor-queries');

        // If the ID looks like a user_id, map it to doctor_id
        let finalDoctorId = doctorId;
        try {
            const profile = await fetchDoctorProfileByUserId(doctorId) as any;
            if (profile) finalDoctorId = profile.id;
        } catch (e) { /* ignore */ }

        const data = await fetchFollowUps(finalDoctorId);

        const formatted = data.map((row: any) => ({
            id: row.id,
            patientId: row.patient_id,
            patientName: row.users?.name ?? 'Unknown',
            patientEmail: row.users?.email ?? '',
            patientAvatar: row.users?.avatar_url ?? '',
            status: row.status === 'completed' || row.status === 'missed' || row.status === 'cancelled' ? row.status : 'pending',
            reason: row.summary || row.chief_complaint || row.symptoms || 'General Follow-up',
            instructions: row.follow_up_plan || row.notes || '',
            scheduledAt: row.follow_up_scheduled_at,
            priority: row.follow_up_priority || 'medium',
            notes: row.clinical_notes || row.notes,
            diagnosis: row.diagnosis || row.summary,
            prescriptions: row.prescription ? [row.prescription] : [],
            createdAt: row.created_at,
            consultationId: row.id,
        }));

        return NextResponse.json({ data: formatted });
    } catch (err: any) {
        console.error('[follow-ups GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { consultationId, scheduledAt } = body ?? {};
    if (!consultationId || !scheduledAt) {
        return NextResponse.json(
            { error: 'consultationId and scheduledAt are required' },
            { status: 400 }
        );
    }

        // The time must be a real date, in the future
    const when = Date.parse(scheduledAt);
    if (Number.isNaN(when)) return NextResponse.json({ error: 'scheduledAt is not a valid date' }, { status: 400 });
    if (when < Date.now() - 60_000) return NextResponse.json({ error: 'Choose a time in the future.' }, { status: 400 });

    // Only the consultation's doctor can schedule a follow-up
    const access = await getConsultationAccess(auth.user, consultationId);
    if (!access || (!access.asDoctor && !auth.user.isAdmin)) return forbidden();
   

    try {
        const { createFollowUp, createNotification } = await import('@/lib/server/queries');
        const data = await createFollowUp({ consultationId, scheduledAt });

        // Generate notification for the patient
        try {
            const { createAdminClient } = await import('@/lib/supabase/client');
            const admin = createAdminClient();

            // Get consultation details to find the patient and doctor
            const { data: consult } = await admin
                .from('consultations')
                .select('patient_id, doctor_id, doctor_profiles!doctor_id(users!user_id(name))')
                .eq('id', consultationId)
                .single();

            if (consult) {
                const doctorName = (consult as any).doctor_profiles?.users?.name ?? 'Your doctor';
                await createNotification({
                    userId: (consult as any).patient_id,
                    type: 'follow_up',
                    title: 'Follow-up session scheduled',
                    message: `${doctorName} has scheduled a follow-up consultation for you.`,
                    doctorName,
                    actionUrl: '/appointments',
                });
            }
        } catch (notifErr) {
            console.warn('[follow-ups POST] notification error:', notifErr);
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (err: any) {
        console.error('[follow-ups POST]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { consultationId, status, scheduledAt, instructions, priority } = body ?? {};
    if (!consultationId) {
        return NextResponse.json({ error: 'consultationId is required' }, { status: 400 });
    }

    const access = await getConsultationAccess(auth.user, consultationId);
    if (!access || (!access.asDoctor && !auth.user.isAdmin)) return forbidden();

    // ── Validate every field before touching the database ──
    const updates: Record<string, unknown> = {};
    if (status !== undefined) {
        if (!['completed', 'cancelled', 'missed', 'follow_up'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        updates.status = status;
        if (status === 'cancelled') {
            // Cancelling the FOLLOW-UP does not cancel the consultation that already happened:
            // it goes back to "completed" and drops off the follow-up list.
            updates.status = 'completed';
            updates.is_follow_up = false;
            updates.follow_up_scheduled_at = null;
            updates.follow_up_reminded_at = null;
        }
    }
    if (scheduledAt !== undefined) {
        const when = Date.parse(scheduledAt);
        if (Number.isNaN(when)) return NextResponse.json({ error: 'scheduledAt is not a valid date' }, { status: 400 });
        if (when < Date.now() - 60_000) return NextResponse.json({ error: 'Choose a time in the future.' }, { status: 400 });
        updates.follow_up_scheduled_at = new Date(when).toISOString();
        updates.follow_up_reminded_at = null; // a new time means a fresh reminder
        updates.is_follow_up = true;
        if (status === undefined) updates.status = 'follow_up'; // rescheduling re-opens a missed/cancelled one
    }
    if (instructions !== undefined) updates.follow_up_plan = String(instructions).slice(0, 4000); // NOT the consultation notes
    if (priority !== undefined) {
        if (!['low', 'medium', 'high'].includes(priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
        updates.follow_up_priority = priority;
    }
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    try {
        const { createAdminClient } = await import('@/lib/supabase/client');
        const admin: any = createAdminClient();

        let { error } = await admin.from('consultations').update(updates).eq('id', consultationId);
        // If the reminders column has not been added yet, save everything else anyway
        if (error && /follow_up_reminded_at/.test(error.message)) {
            delete updates.follow_up_reminded_at;
            ({ error } = await admin.from('consultations').update(updates).eq('id', consultationId));
        }
        if (error) throw error;

        // Tell the patient when their appointment moves or is cancelled
        if (updates.follow_up_scheduled_at || status === 'cancelled') {
            try {
                const { createNotification } = await import('@/lib/server/queries');
                const { data: c } = await admin.from('consultations')
                    .select('patient_id, doctor_profiles!doctor_id(users!user_id(name))').eq('id', consultationId).maybeSingle();
                if (c?.patient_id) {
                    const doctorName = c.doctor_profiles?.users?.name ?? 'Your doctor';
                    await createNotification({
                        userId: c.patient_id,
                        type: 'follow_up',
                        title: status === 'cancelled' ? 'Follow-up cancelled' : 'Follow-up rescheduled',
                        message: status === 'cancelled'
                            ? `${doctorName} cancelled your follow-up consultation.`
                            : `${doctorName} moved your follow-up consultation. Open the app to see the new time.`,
                        doctorName,
                        actionUrl: '/appointments',
                        refId: consultationId,
                        refTable: 'consultations',
                    });
                }
            } catch (notifErr) {
                console.warn('[follow-ups PATCH] notification error:', notifErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[follow-ups PATCH]', err.message);
        return NextResponse.json({ error: 'Could not update the follow-up' }, { status: 500 });
    }
}
