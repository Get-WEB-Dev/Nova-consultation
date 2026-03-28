/**
 * Follow-Up API
 *
 * GET  /api/follow-ups?doctorId=<uuid>    — get follow-up consultations for a doctor
 * POST /api/follow-ups                    — mark a consultation as follow-up
 *      body: { consultationId, scheduledAt }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ data: [], error: 'doctorId is required' }, { status: 400 });
    }

    try {
        const { fetchFollowUps } = await import('@/lib/server/queries');
        const { fetchDoctorProfileByUserId } = await import('@/lib/server/doctor-queries');

        // If the ID looks like a user_id, map it to doctor_id
        let finalDoctorId = doctorId;
        try {
            const profile = await fetchDoctorProfileByUserId(doctorId);
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

    try {
        const { createAdminClient } = await import('@/lib/supabase/client');
        const admin = createAdminClient();

        const updates: any = {};
        if (status) updates.status = status;
        if (scheduledAt) updates.follow_up_scheduled_at = scheduledAt;
        if (instructions) updates.notes = instructions;

        const { error } = await admin
            .from('consultations')
            .update(updates as never)
            .eq('id', consultationId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[follow-ups PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
