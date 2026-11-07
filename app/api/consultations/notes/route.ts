/**
 * Consultations Notes API
 *
 * PUT /api/consultations/notes — save structured medical notes
 *     body: { consultationId, doctorId, patientId, notes: { chiefComplaint, diagnosis, prescription, clinicalNotes, followUpPlan } }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, getConsultationAccess, forbidden } from '@/lib/server/auth';

export async function PUT(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { consultationId, notes } = body ?? {};
    if (!consultationId || !notes) {
        return NextResponse.json({ error: 'consultationId and notes are required' }, { status: 400 });
    }

    // Only the consultation's doctor can write clinical notes
    const access = await getConsultationAccess(auth.user, consultationId);
    if (!access || (!access.asDoctor && !auth.user.isAdmin)) return forbidden();

    try {
        const { saveStructuredNotes } = await import('@/lib/server/doctor-queries');
        const data = await saveStructuredNotes(consultationId, notes);
        return NextResponse.json({ data, success: true });
    } catch (err: any) {
        console.error('[consultations/notes PUT]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
