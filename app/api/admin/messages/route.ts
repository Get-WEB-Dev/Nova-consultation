import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { listContactMessages, setContactStatus, deleteContactMessage } from '@/lib/server/admin-extra';
import { parseListParams } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to } = parseListParams(req);
        return NextResponse.json(await listContactMessages({ q, status: sp.get('status') ?? undefined, from, to }));
    } catch (err: any) {
        console.error('[admin/messages GET]', err.message);
        const missing = /contact_messages|does not exist/i.test(err.message);
        return NextResponse.json(
            { data: [], total: 0, error: missing ? 'The contact_messages table is missing. Run the Batch 4 SQL.' : err.message },
            { status: 500 },
        );
    }
}

export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { id, status } = await req.json();
        if (!isUuid(id) || !['new', 'read', 'resolved'].includes(status)) return fail('id and a valid status are required');
        await setContactStatus(id, status);
        if (status === 'resolved') await logAdminAction(auth.user, 'message.resolved', 'message', id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { id } = await req.json();
        if (!isUuid(id)) return fail('A valid id is required');
        await deleteContactMessage(id);
        await logAdminAction(auth.user, 'message.deleted', 'message', id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}