import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, getConsultationAccess, forbidden } from '@/lib/server/auth';

const ALL_STATUSES = ['active', 'completed', 'missed', 'follow_up', 'waiting', 'cancelled'];
// A patient may end/leave a consultation but not mark it active/follow_up
const PATIENT_STATUSES = ['completed', 'cancelled', 'missed'];

export async function PATCH(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    try {
        const body = await req.json();
        const { consultationId, status } = body;

        if (!consultationId || !status) {
            return NextResponse.json({ error: 'Missing consultationId or status' }, { status: 400 });
        }
        if (!ALL_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const access = await getConsultationAccess(auth.user, consultationId);
        if (!access) return forbidden();
        if (!access.asDoctor && !auth.user.isAdmin && !PATIENT_STATUSES.includes(status)) {
            return forbidden('Patients cannot set this status');
        }

        const { updateConsultationStatus } = await import('@/lib/server/queries');
        await updateConsultationStatus(consultationId, status);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[consultations status PATCH] error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
