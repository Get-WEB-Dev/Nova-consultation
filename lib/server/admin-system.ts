import { createAdminClient } from '@/lib/supabase/client';
import { getSettingsStatus } from '@/lib/server/platform-settings';
import { countSuperAdmins } from '@/lib/server/admin-access';

export type CheckStatus = 'ok' | 'warn' | 'fail';
export interface Check { id: string; group: 'Database' | 'Features' | 'Security' | 'Configuration'; label: string; status: CheckStatus; detail: string; fix?: string }

const TABLES = [
    { table: 'admin_audit_log', label: 'Activity log', phase: 'the original admin setup SQL' },
    { table: 'doctor_credentials', label: 'Doctor credentials', phase: 'the Batch 2 SQL' },
    { table: 'contact_messages', label: 'Contact inbox', phase: 'the Batch 4 SQL' },
    { table: 'admin_notes', label: 'Internal notes', phase: 'the Phase 1 SQL' },
    { table: 'announcements', label: 'Announcement history', phase: 'the Phase 2 SQL' },
    { table: 'platform_settings', label: 'Platform settings', phase: 'the Phase 2 SQL' },
    { table: 'data_requests', label: 'Data requests', phase: 'the Phase 3 SQL' },
];

const FUNCTIONS = [
    { name: 'admin_analytics', args: { p_days: 7 }, phase: 'the Batch 4 SQL' },
    { name: 'admin_doctor_metrics', args: { p_doctor: '00000000-0000-0000-0000-000000000000' }, phase: 'the Phase 1 SQL' },
    { name: 'admin_report', args: { p_from: '2026-01-01', p_to: '2026-01-02' }, phase: 'the Phase 2 SQL' },
    { name: 'admin_security_check', args: {}, phase: 'the Phase 3 SQL' },
];

const RELOAD = "notify pgrst, 'reload schema';";
const BOOTSTRAP_SUPER = `insert into admins (user_id, is_super_admin, permissions)
select id, true, '{all}' from users where email = 'YOUR-EMAIL@example.com'
on conflict (user_id) do update set is_super_admin = true, permissions = '{all}';`;

async function safe(id: string, group: Check['group'], label: string, fn: () => Promise<Omit<Check, 'id' | 'group' | 'label'>>): Promise<Check> {
    try {
        return { id, group, label, ...(await fn()) };
    } catch (e: any) {
        return { id, group, label, status: 'fail', detail: e?.message ?? 'Check failed' };
    }
}

export async function runSystemChecks() {
    const admin: any = createAdminClient();
    const checks: Promise<Check>[] = [];

    // ── Database ────────────────────────────────────────────
    let latencyMs = 0;
    checks.push(safe('db', 'Database', 'Database connection', async () => {
        const t0 = Date.now();
        const { error } = await admin.from('users').select('id', { head: true, count: 'exact' }).limit(1);
        latencyMs = Date.now() - t0;
        if (error) return { status: 'fail', detail: error.message };
        return { status: latencyMs > 1500 ? 'warn' : 'ok', detail: `Responded in ${latencyMs} ms` };
    }));

    // ── Features: every table / function the admin portal depends on ──
    for (const t of TABLES) {
        checks.push(safe(`table:${t.table}`, 'Features', t.label, async () => {
            const { error } = await admin.from(t.table).select('*', { head: true, count: 'exact' }).limit(1);
            if (!error) return { status: 'ok', detail: `Table “${t.table}” is ready` };
            const staleCache = /schema cache/i.test(error.message);
            return {
                status: 'fail',
                detail: staleCache ? `Table “${t.table}” exists but the API has not refreshed yet` : `Table “${t.table}” is missing (${error.message})`,
                fix: staleCache ? RELOAD : `Run ${t.phase} in the Supabase SQL editor, then run:\n${RELOAD}`,
            };
        }));
    }
    for (const f of FUNCTIONS) {
        checks.push(safe(`fn:${f.name}`, 'Features', `Function ${f.name}`, async () => {
            const { error } = await admin.rpc(f.name, f.args);
            if (!error) return { status: 'ok', detail: 'Installed and working' };
            return { status: 'fail', detail: error.message, fix: `Run ${f.phase} in the Supabase SQL editor, then run:\n${RELOAD}` };
        }));
    }

    // ── Security ────────────────────────────────────────────
    for (const b of [
        { id: 'chat-attachments', label: 'Chat attachments are private' },
        { id: 'doctor-credentials', label: 'Doctor licenses are private' },
    ]) {
        checks.push(safe(`bucket:${b.id}`, 'Security', b.label, async () => {
            const { data, error } = await admin.storage.getBucket(b.id);
            if (error || !data) return { status: 'warn', detail: 'Not created yet. It is created automatically (as private) on the first upload.' };
            return data.public
                ? { status: 'fail', detail: 'Anyone who has a file’s link can open it', fix: `update storage.buckets set public = false where id = '${b.id}';` }
                : { status: 'ok', detail: 'Files open only through short-lived signed links' };
        }));
    }

    checks.push(safe('posture', 'Security', 'Database access rules', async () => {
        const { data, error } = await admin.rpc('admin_security_check');
        if (error) return { status: 'warn', detail: 'Could not inspect the rules (install the Phase 3 SQL)', fix: `Run the Phase 3 SQL, then:\n${RELOAD}` };
        const noRls: string[] = data.tables_without_rls ?? [];
        const writes: { table: string; policy: string; command: string }[] = data.browser_write_policies ?? [];
        if (noRls.length) {
            return { status: 'fail', detail: `${noRls.length} table(s) have no row-level security: ${noRls.join(', ')}`, fix: noRls.map((t) => `alter table ${t} enable row level security;`).join('\n') };
        }
        if (writes.length) {
            return {
                status: 'fail',
                detail: `${writes.length} polic${writes.length === 1 ? 'y lets' : 'ies let'} a signed-in browser write to the database directly (${writes.slice(0, 4).map((w) => `${w.table}.${w.policy}`).join(', ')}${writes.length > 4 ? '…' : ''})`,
                fix: `-- Your app writes through the server, so these can be removed.\n` + writes.slice(0, 60).map((w) => `drop policy if exists "${w.policy}" on ${w.table};`).join('\n'),
            };
        }
        return { status: 'ok', detail: `All ${data.table_count} tables use row-level security; no policy allows direct browser writes` };
    }));

    checks.push(safe('super', 'Security', 'A super admin exists', async () => {
        const n = await countSuperAdmins(admin);
        return n > 0
            ? { status: 'ok', detail: `${n} super admin${n === 1 ? '' : 's'}` }
            : { status: 'fail', detail: 'Nobody can change platform settings or send announcements', fix: BOOTSTRAP_SUPER };
    }));

    checks.push(safe('mfa', 'Security', 'Two-factor required for admins', async () =>
        process.env.ADMIN_REQUIRE_MFA === 'true'
            ? { status: 'ok', detail: 'Admins must verify with an authenticator app' }
            : { status: 'warn', detail: 'Not enforced yet. Enrol every admin first, then set ADMIN_REQUIRE_MFA=true in your hosting settings.' }));

    checks.push(safe('registrations', 'Security', 'New registrations', async () => {
        const { settings, problem } = await getSettingsStatus();
        if (problem) return { status: 'warn', detail: 'Cannot read the setting, so sign-up stays open', fix: RELOAD };
        return { status: 'ok', detail: settings.registrations_open ? 'Open' : 'Paused by an admin' };
    }));

    // ── Configuration (only whether each value exists, never the value) ──
    const env = (name: string, label: string, required = true): Promise<Check> =>
        safe(`env:${name}`, 'Configuration', label, async () =>
            process.env[name]
                ? { status: 'ok', detail: 'Set' }
                : { status: required ? 'fail' : 'warn', detail: 'Not set', fix: `Add ${name} to your hosting environment variables and redeploy.` });
    checks.push(env('NEXT_PUBLIC_SUPABASE_URL', 'Supabase URL'));
    checks.push(env('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase public key'));
    checks.push(env('SUPABASE_SERVICE_ROLE_KEY', 'Supabase server key'));
    checks.push(env('LIVEKIT_API_KEY', 'Video calls: API key'));
    checks.push(env('LIVEKIT_API_SECRET', 'Video calls: API secret'));
    checks.push(env('NEXT_PUBLIC_LIVEKIT_URL', 'Video calls: server URL'));
    checks.push(env('NEXT_PUBLIC_APP_URL', 'Public site address', false));

    const results = await Promise.all(checks);
    const summary = {
        ok: results.filter((c) => c.status === 'ok').length,
        warn: results.filter((c) => c.status === 'warn').length,
        fail: results.filter((c) => c.status === 'fail').length,
    };
    return { checks: results, summary, latencyMs, checkedAt: new Date().toISOString() };
}