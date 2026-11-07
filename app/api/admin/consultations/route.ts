import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { fetchAdminConsultations } = await import('@/lib/server/admin-queries');
        return NextResponse.json({ data: await fetchAdminConsultations() });
    } catch (err: any) {
        console.error('[admin/consultations GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

// Cancel a stuck active/waiting consultation
export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { consultationId } = await req.json();
        if (!consultationId) {
            return NextResponse.json({ error: 'consultationId required' }, { status: 400 });
        }
        const { adminCancelConsultation } = await import('@/lib/server/admin-queries');
        await adminCancelConsultation(consultationId);
        const { logAdminAction } = await import('@/lib/server/admin-queries');
        await logAdminAction(auth.user, 'consultation.cancelled', 'consultation', consultationId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/consultations PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}