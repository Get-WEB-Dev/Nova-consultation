"use client";

import { useState, type ReactNode } from "react";
import { Lock, ShieldAlert, EyeOff, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast } from "@/components/admin/AdminUI";

/**
 * Sensitive data stays locked until the admin writes a reason.
 * The reason is saved permanently in the Activity Log BEFORE anything is shown.
 */
export default function RevealGate<T>({ type, id, title, description, children }: {
    type: "user_medical" | "consultation_clinical";
    id: string;
    title: string;
    description: string;
    children: (data: T) => ReactNode;
}) {
    const toast = useToast();
    const [data, setData] = useState<T | null>(null);
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            const json = await adminFetch<{ data: T }>("/api/admin/reveal", { method: "POST", body: JSON.stringify({ type, id, reason: reason.trim() }) });
            setData(json.data);
            setOpen(false);
            setReason("");
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
        }
    };

    if (data) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs text-amber-700">
                    <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Sensitive information. This access was recorded in the Activity Log.</span>
                    <button onClick={() => setData(null)} className="flex items-center gap-1 font-semibold hover:underline"><EyeOff className="w-3.5 h-3.5" /> Hide</button>
                </div>
                {children(data)}
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col items-center text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3"><Lock className="w-5 h-5 text-amber-600" /></div>
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
                <button onClick={() => setOpen(true)} className="btn btn-sm btn-secondary mt-4">View with a reason</button>
            </div>

            {open && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={() => !busy && setOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md animate-fade-up space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-semibold text-slate-800">Why do you need this?</h3>
                        <p className="text-sm text-slate-500">Your reason, name and the time are stored permanently and are visible to other admins.</p>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} autoFocus
                            placeholder="e.g. Patient asked us to correct their allergy record (ticket #123)" className="input-field" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setOpen(false)} disabled={busy} className="btn btn-sm btn-secondary">Cancel</button>
                            <button onClick={submit} disabled={busy || reason.trim().length < 8} className="btn btn-sm btn-primary">
                                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Record & view
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}