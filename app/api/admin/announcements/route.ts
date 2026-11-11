import { NextResponse } from 'next/server';
import { requireUser, requireSuperAdmin } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import { logAdminAction } from '@/lib/server/admin-queries';
import { sendAnnouncement, listAnnouncements } from '@/lib/server/admin-extra';
import { parseListParams } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

// History: any admin can see what was sent
export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { from, to } = parseListParams(req);
        return NextResponse.json(await listAnnouncements({ from, to }));
    } catch (err: any) {
        const missing = /announcements|does not exist/i.test(err.message);
        return NextResponse.json({ data: [], total: 0, error: missing ? 'Run the Phase 2 SQL (announcements table is missing).' : err.message }, { status: 500 });
    }
}

// Sending reaches every user, so it is super-admin only
export async function POST(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (auth.error) return auth.error;
    try {
        const { audience, title, message } = await req.json();
        if (!['all', 'patients', 'doctors'].includes(audience)) return fail('Choose who should receive this');
        const t = String(title ?? '').trim();
        const m = String(message ?? '').trim();
        if (t.length < 3 || t.length > 100) return fail('Title must be 3–100 characters');
        if (m.length < 5 || m.length > 500) return fail('Message must be 5–500 characters');

        const { data: recent } = await (createAdminClient() as any)
            .from('admin_audit_log').select('id')
            .eq('admin_id', auth.user.id).eq('action', 'announcement.sent')
            .gte('created_at', new Date(Date.now() - 60_000).toISOString()).limit(1);
        if (recent?.length) return fail('You just sent an announcement. Wait a minute before sending another.', 429);

        const result = await sendAnnouncement({ audience, title: t, message: m, createdBy: { id: auth.user.id, email: auth.user.email } });
        await logAdminAction(auth.user, 'announcement.sent', 'announcement', result.id, `${audience}: "${t}" → ${result.sent} recipients`);
        return NextResponse.json({ success: true, sent: result.sent, id: result.id });
    } catch (err: any) {
        console.error('[admin/announcements POST]', err.message);
        return fail(err.message, 500);
    }
}