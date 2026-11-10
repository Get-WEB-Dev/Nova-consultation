"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, StickyNote, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, ConfirmDialog, timeAgo } from "@/components/admin/AdminUI";
import { Avatar, EmptyPanel } from "@/components/admin/kit";

interface Note { id: string; admin_id: string | null; admin_email: string | null; note: string; created_at: string }
type Entity = "user" | "doctor" | "consultation" | "message";

/** Private notes only admins can see: support context, follow-ups, decisions. */
export default function NotesPanel({ entityType, entityId }: { entityType: Entity; entityId: string }) {
    const toast = useToast();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [saving, setSaving] = useState(false);
    const [del, setDel] = useState<Note | null>(null);

    const load = useCallback(async () => {
        try {
            const json = await adminFetch<{ data: Note[] }>(`/api/admin/notes?entityType=${entityType}&entityId=${entityId}`);
            setNotes(json.data);
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, toast]);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            const json = await adminFetch<{ data: Note }>("/api/admin/notes", { method: "POST", body: JSON.stringify({ entityType, entityId, note: text.trim() }) });
            setNotes((n) => [json.data, ...n]);
            setText("");
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!del) return;
        try {
            await adminFetch("/api/admin/notes", { method: "DELETE", body: JSON.stringify({ noteId: del.id }) });
            setNotes((n) => n.filter((x) => x.id !== del.id));
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setDel(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000}
                    placeholder="Add a private note for the team…" className="input-field" />
                <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">Only admins can see notes · {text.length}/2000</span>
                    <button onClick={add} disabled={saving || !text.trim()} className="btn btn-sm btn-primary">
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add note
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="animate-shimmer h-16 rounded-xl" />
            ) : notes.length === 0 ? (
                <EmptyPanel icon={StickyNote} title="No notes yet" text="Write down anything the next admin should know." />
            ) : (
                <ul className="space-y-3">
                    {notes.map((n) => (
                        <li key={n.id} className="flex gap-3">
                            <Avatar name={n.admin_email ?? "Admin"} size={32} />
                            <div className="flex-1 min-w-0 bg-slate-50 rounded-xl px-3.5 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-600 truncate">{n.admin_email ?? "An admin"} <span className="font-normal text-slate-400">· {timeAgo(n.created_at)}</span></p>
                                    <button onClick={() => setDel(n)} className="text-slate-300 hover:text-rose-500" aria-label="Delete note"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-1">{n.note}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <ConfirmDialog open={!!del} danger title="Delete this note?" message="This cannot be undone."
                confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />
        </div>
    );
}