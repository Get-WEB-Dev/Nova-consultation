import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import {
    listConsultations, exportConsultations, adminCancelConsultation, logAdminAction,
} from '@/lib/server/admin-queries';
import { parseListParams, toCsv, csvResponse, today } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to, wantsCsv } = parseListParams(req);
        const opts = { q, status: sp.get('status') ?? undefined };

        if (wantsCsv) {
            const rows = await exportConsultations(opts);
            await logAdminAction(auth.user, 'export.consultations', 'consultation', auth.user.id, `${rows.length} rows`);
            return csvResponse(
                toCsv(rows, [
                    { header: 'Created', value: (r) => r.createdAt },
                    { header: 'Patient', value: (r) => r.patientName },
                    { header: 'Patient email', value: (r) => r.patientEmail },
                    { header: 'Doctor', value: (r) => r.doctorName },
                    { header: 'Specialty', value: (r) => r.specialty },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Duration (min)', value: (r) => r.durationMinutes },
                    { header: 'Rating', value: (r) => r.rating },
                    { header: 'Follow-up', value: (r) => (r.isFollowUp ? 'yes' : 'no') },
                ]),
                `consultations-${today()}.csv`,
            );
        }
        return NextResponse.json(await listConsultations({ ...opts, from, to }));
    } catch (err: any) {
        console.error('[admin/consultations GET]', err.message);
        return NextResponse.json({ data: [], total: 0, error: err.message }, { status: 500 });
    }
}

// Cancel a stuck active/waiting consultation
export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { consultationId } = await req.json();
        if (!isUuid(consultationId)) {
            return NextResponse.json({ error: 'A valid consultationId is required' }, { status: 400 });
        }
        await adminCancelConsultation(consultationId);
        await logAdminAction(auth.user, 'consultation.cancelled', 'consultation', consultationId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/consultations PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}