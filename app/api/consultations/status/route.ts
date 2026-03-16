import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { consultationId, status } = body;

        if (!consultationId || !status) {
            return NextResponse.json({ error: 'Missing consultationId or status' }, { status: 400 });
        }

        const { updateConsultationStatus } = await import('@/lib/server/queries');
        await updateConsultationStatus(consultationId, status);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[consultations status PATCH] error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
