"use client";

import { useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, ConfirmDialog } from "@/components/admin/AdminUI";

const AUDIENCES = [
    { key: "all", label: "Everyone" },
    { key: "patients", label: "Patients" },
    { key: "doctors", label: "Doctors" },
];

export default function AdminAnnouncementsPage() {
    const toast = useToast();
    const [audience, setAudience] = useState("all");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const valid = title.trim().length >= 3 && message.trim().length >= 5;
    const label = AUDIENCES.find((a) => a.key === audience)!.label.toLowerCase();

    const send = async () => {
        setBusy(true);
        try {
            const json = await adminFetch<{ sent: number }>("/api/admin/announcements", {
                method: "POST",
                body: JSON.stringify({ audience, title: title.trim(), message: message.trim() }),
            });
            toast("success", `Sent to ${json.sent.toLocaleString()} users`);
            setTitle(""); setMessage("");
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setConfirm(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-up max-w-2xl">
            <PageHeader title="Announcements" subtitle="Send a notification to a group of users. Super admins only." />

            <div className="card space-y-4">
                <div className="flex gap-2 flex-wrap">
                    {AUDIENCES.map((a) => (
                        <button key={a.key} onClick={() => setAudience(a.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${audience === a.key ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {a.label}
                        </button>
                    ))}
                </div>
                <div>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title" className="input-field" />
                    <p className="text-[11px] text-slate-300 mt-1 text-right">{title.length}/100</p>
                </div>
                <div>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} placeholder="Message" className="input-field" />
                    <p className="text-[11px] text-slate-300 mt-1 text-right">{message.length}/500</p>
                </div>
                <button disabled={!valid || busy} onClick={() => setConfirm(true)} className="btn btn-primary">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Review & send
                </button>
            </div>

            <ConfirmDialog open={confirm} loading={busy} danger title="Send this announcement?"
                message={`"${title.trim()}" will appear in the notifications of ${label}. This cannot be undone.`}
                confirmLabel="Send now" onConfirm={send} onCancel={() => setConfirm(false)} />
        </div>
    );
}