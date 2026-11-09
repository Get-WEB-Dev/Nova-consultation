import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { listAuditLog, exportAuditLog, logAdminAction } from '@/lib/server/admin-queries';
import { parseListParams, toCsv, csvResponse, today } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/; // only accept YYYY-MM-DD

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to, wantsCsv } = parseListParams(req);
        const date = (key: string) => {
            const v = sp.get(key);
            return v && DATE.test(v) ? v : undefined;
        };
        const opts = { q, category: sp.get('category') ?? undefined, since: date('since'), until: date('until') };

        if (wantsCsv) {
            const rows = await exportAuditLog(opts);
            await logAdminAction(auth.user, 'export.audit_log', 'audit_log', auth.user.id, `${rows.length} rows`);
            return csvResponse(
                toCsv(rows, [
                    { header: 'Time (UTC)', value: (r) => r.created_at },
                    { header: 'Admin', value: (r) => r.admin_email },
                    { header: 'Action', value: (r) => r.action },
                    { header: 'Target type', value: (r) => r.target_type },
                    { header: 'Target ID', value: (r) => r.target_id },
                    { header: 'Details', value: (r) => r.details },
                ]),
                `activity-log-${today()}.csv`,
            );
        }
        return NextResponse.json(await listAuditLog({ ...opts, from, to }));
    } catch (err: any) {
        console.error('[admin/activity GET]', err.message);
        const missing = /admin_audit_log|relation|does not exist/i.test(err.message);
        return NextResponse.json(
            { data: [], total: 0, error: missing ? 'The audit log table does not exist yet. Run the SQL from the setup guide in Supabase.' : err.message },
            { status: 500 },
        );
    }
}