import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return NextResponse.json({ error: 'Invalid message id' }, { status: 400 });
    try {
        const admin: any = createAdminClient();
        const { data: m, error } = await admin.from('contact_messages')
            .select('id, name, email, subject, message, status, created_at').eq('id', params.id).maybeSingle();
        if (error) throw error;
        if (!m) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        // Is the sender one of our users? Then link straight to their page.
        const { data: account } = await admin.from('users').select('id, name, role').eq('email', String(m.email).toLowerCase()).maybeSingle();
        return NextResponse.json({ data: { ...m, account: account ?? null } });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}