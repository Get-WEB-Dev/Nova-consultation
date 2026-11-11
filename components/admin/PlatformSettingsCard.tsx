"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, ConfirmDialog } from "@/components/admin/AdminUI";

/** Platform switches that really change how the app behaves. */
export default function PlatformSettingsCard() {
    const toast = useToast();
    const [open, setOpen] = useState<boolean | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const json = await adminFetch<{ data: { registrations_open: boolean }; canEdit: boolean }>("/api/admin/platform-settings");
            setOpen(json.data.registrations_open);
            setCanEdit(json.canEdit);
        } catch (e: any) {
            toast("error", e.message);
        }
    }, [toast]);
    useEffect(() => { load(); }, [load]);

    const change = async () => {
        if (open === null) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/platform-settings", { method: "PUT", body: JSON.stringify({ key: "registrations_open", value: !open }) });
            toast("success", !open ? "Registrations are open" : "Registrations are paused");
            await load();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setConfirm(false);
        }
    };

    if (open === null) return null;

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold text-slate-700">Platform</h2>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-slate-700">New registrations</p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-md">
                        When paused, nobody can create a new account. Existing users are not affected. Use it during an incident or a migration.
                    </p>
                    {!canEdit && <p className="text-xs text-amber-600 mt-1">Only super admins can change this.</p>}
                </div>
                <button role="switch" aria-checked={open} aria-label="New registrations" disabled={!canEdit || busy} onClick={() => setConfirm(true)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${open ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${open ? "translate-x-5" : ""}`} />
                </button>
            </div>
            <ConfirmDialog open={confirm} loading={busy} danger={open} title={open ? "Pause new registrations?" : "Open registrations again?"}
                message={open ? "People will see “registrations are temporarily closed” when they try to sign up." : "Anyone will be able to create an account again."}
                confirmLabel={open ? "Pause" : "Open"} onConfirm={change} onCancel={() => setConfirm(false)} />
        </section>
    );
}