/**
 * Consultations Notes API
 *
 * PUT /api/consultations/notes — save structured medical notes
 *     body: { consultationId, doctorId, patientId, notes: { chiefComplaint, diagnosis, prescription, clinicalNotes, followUpPlan } }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function PUT(req: NextRequest) {
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

    try {
        const { saveStructuredNotes } = await import('@/lib/server/doctor-queries');
        const data = await saveStructuredNotes(consultationId, notes);
        return NextResponse.json({ data, success: true });
    } catch (err: any) {
        console.error('[consultations/notes PUT]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
