import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import { logAdminAction } from '@/lib/server/admin-queries';
import { getUserDetail } from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

// Everything about one user (no medical data; that needs /api/admin/reveal)
export async function GET(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return fail('Invalid user id');
    try {
        const data = await getUserDetail(params.id);
        if (!data) return fail('User not found', 404);
        return NextResponse.json({ data });
    } catch (err: any) {
        console.error('[admin/users/:id GET]', err.message);
        return fail(err.message, 500);
    }
}

// Send this one user a notification
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    if (!isUuid(params.id)) return fail('Invalid user id');
    try {
        const body = await req.json();
        const title = String(body?.title ?? '').trim();
        const message = String(body?.message ?? '').trim();
        if (title.length < 3 || title.length > 100) return fail('Title must be 3–100 characters');
        if (message.length < 5 || message.length > 500) return fail('Message must be 5–500 characters');

        const admin: any = createAdminClient();
        const { data: target } = await admin.from('users').select('id').eq('id', params.id).maybeSingle();
        if (!target) return fail('User not found', 404);

        const { error } = await admin.from('notifications').insert({ user_id: params.id, type: 'system', title, message });
        if (error) throw error;
        await logAdminAction(auth.user, 'user.notified', 'user', params.id, title);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users/:id POST]', err.message);
        return fail(err.message, 500);
    }
}