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
        const data = await fetchFollowUps(doctorId);

        const formatted = data.map((row: any) => ({
            id: row.id,
            doctorId: row.doctor_id,
            patientId: row.patient_id,
            patientName: row.users?.name ?? 'Unknown',
            patientAvatar: row.users?.avatar_url ?? '',
            status: row.status,
            notes: row.notes,
            summary: row.summary,
            symptoms: row.symptoms,
            isFollowUp: row.is_follow_up,
            followUpScheduledAt: row.follow_up_scheduled_at,
            created_at: row.created_at,
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
