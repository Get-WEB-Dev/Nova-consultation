"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ConfirmDialog, useToast } from "@/components/admin/AdminUI";

export default function SignOutEverywhere() {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const { error } = await supabase.auth.signOut({ scope: "global" });
            if (error) throw error;
            window.location.href = "/admin-login";
        } catch (e: any) {
            toast("error", e.message);
            setBusy(false);
            setOpen(false);
        }
    };

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold text-slate-700">Sessions</h2>
            <p className="text-sm text-slate-500">
                Lost a device or shared a computer? This signs you out everywhere. Other devices stop
                refreshing immediately, and any open page expires within about an hour.
            </p>
            <button onClick={() => setOpen(true)} className="btn btn-sm btn-secondary">
                <LogOut className="w-3.5 h-3.5" /> Sign out of all devices
            </button>
            <ConfirmDialog open={open} loading={busy} danger title="Sign out everywhere?"
                message="You will need to sign in again on every device, including this one."
                confirmLabel="Sign out" onConfirm={run} onCancel={() => setOpen(false)} />
        </section>
    );
}