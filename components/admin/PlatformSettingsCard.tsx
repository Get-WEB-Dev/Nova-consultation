"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, ConfirmDialog } from "@/components/admin/AdminUI";
import CodeBlock from "@/components/admin/CodeBlock";

interface Status {
    data: { registrations_open: boolean };
    canEdit: boolean;
    problem: { code: "table_missing" | "schema_cache" | "read_failed"; message: string } | null;
    superAdminCount: number;
}

const CREATE_SQL = `create table if not exists platform_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table platform_settings enable row level security;
insert into platform_settings (key, value) values ('registrations_open', 'true'::jsonb)
on conflict (key) do nothing;
notify pgrst, 'reload schema';`;

const RELOAD_SQL = "notify pgrst, 'reload schema';";

const SUPER_SQL = `insert into admins (user_id, is_super_admin, permissions)
select id, true, '{all}' from users where email = 'YOUR-EMAIL@example.com'
on conflict (user_id) do update set is_super_admin = true, permissions = '{all}';`;

/** Platform switches that really change how the app behaves, and a clear reason when they can't be changed. */
export default function PlatformSettingsCard() {
    const toast = useToast();
    const [status, setStatus] = useState<Status | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setStatus(await adminFetch<Status>("/api/admin/platform-settings"));
            setLoadError(null);
        } catch (e: any) {
            setLoadError(e.message);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const open = status?.data.registrations_open ?? true;

    const change = async () => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/platform-settings", { method: "PUT", body: JSON.stringify({ key: "registrations_open", value: !open }) });
            await load(); // show what the database really holds
            toast("success", !open ? "Registrations are open (saved and verified)" : "Registrations are paused (saved and verified)");
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setConfirm(false);
        }
    };

    if (loadError) {
        return (
            <section className="card space-y-2">
                <h2 className="font-semibold text-slate-700">Platform</h2>
                <p className="text-sm text-rose-600">Could not load the platform settings: {loadError}</p>
                <button onClick={load} className="btn btn-sm btn-secondary">Try again</button>
            </section>
        );
    }
    if (!status) return null;

    const { problem, canEdit, superAdminCount } = status;
    const blocked = !!problem || !canEdit;

    return (
        <section className="card space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">Platform</h2>
                <button onClick={load} className="text-xs text-slate-400 hover:text-slate-600">Re-check</button>
            </div>

            {problem && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-2.5">
                    <p className="flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span><b>The setting cannot be saved yet.</b> {problem.message}</span>
                    </p>
                    {problem.code === "table_missing" && (<><p className="text-xs text-amber-700">Run this once in the Supabase SQL editor:</p><CodeBlock code={CREATE_SQL} /></>)}
                    {problem.code === "schema_cache" && <CodeBlock code={RELOAD_SQL} />}
                </div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        New registrations
                        <span className={`badge ${open ? "badge-green" : "badge-rose"}`}>{open ? "Open" : "Paused"}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                        When paused, nobody can create a new account and they see a “temporarily closed” message. Existing users are not affected.
                        Use it during an incident or a migration.
                    </p>
                </div>
                <button role="switch" aria-checked={open} aria-label="New registrations" disabled={blocked || busy} onClick={() => setConfirm(true)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${open ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${open ? "translate-x-5" : ""}`} />
                </button>
            </div>

            {!canEdit && !problem && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
                    {superAdminCount === 0 ? (
                        <>
                            <p className="text-sm text-slate-700"><b>Why it is locked:</b> no super admin exists yet. Run this once in the Supabase SQL editor (use your own email):</p>
                            <CodeBlock code={SUPER_SQL} />
                        </>
                    ) : (
                        <p className="text-sm text-slate-700">
                            <b>Why it is locked:</b> only super admins can change platform settings, and your account is a regular admin.
                            A super admin can upgrade you on the <a href="/admin-dashboard/admins" className="text-primary-600 font-semibold hover:underline">Admins page</a>.
                        </p>
                    )}
                </div>
            )}

            <ConfirmDialog open={confirm} loading={busy} danger={open} title={open ? "Pause new registrations?" : "Open registrations again?"}
                message={open ? "People will see “registrations are temporarily closed” when they try to sign up." : "Anyone will be able to create an account again."}
                confirmLabel={open ? "Pause" : "Open"} onConfirm={change} onCancel={() => setConfirm(false)} />
        </section>
    );
}