import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { fetchAuditLog } = await import('@/lib/server/admin-queries');
        return NextResponse.json({ data: await fetchAuditLog() });
    } catch (err: any) {
        console.error('[admin/activity GET]', err.message);
        const missing = /admin_audit_log|relation|does not exist/i.test(err.message);
        return NextResponse.json(
            { data: [], error: missing ? 'The audit log table does not exist yet. Run the SQL from the setup guide in Supabase.' : err.message },
            { status: 500 }
        );
    }
}