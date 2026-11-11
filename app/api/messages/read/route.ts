/**
 * POST /api/messages/read   body: { conversationId }
 * Marks everything the OTHER person sent in this chat as read.
 */
import { NextResponse } from 'next/server';
import { requireUser, getThreadAccess, forbidden } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
    if (!body?.conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });

    const thread = await getThreadAccess(auth.user, { conversationId: body.conversationId });
    if (!thread?.doctorProfileId || !thread.patientId) return forbidden();

    try {
        const admin: any = createAdminClient();
        const { data, error } = await admin
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('doctor_id', thread.doctorProfileId)
            .eq('patient_id', thread.patientId)
            .neq('sender_id', auth.user.id)
            .is('read_at', null)
            .select('id');
        if (error) throw error;
        return NextResponse.json({ updated: data?.length ?? 0 });
    } catch (err: any) {
        console.error('[messages/read]', err.message);
        const needsSql = /read_at/.test(err.message);
        return NextResponse.json({ error: needsSql ? 'Run the messages SQL in Supabase first.' : 'Could not update read status' }, { status: 500 });
    }
}