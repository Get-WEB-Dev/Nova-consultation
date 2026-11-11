"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell, MessageCircle, ShieldCheck, CheckCheck, BellRing, Users, Zap, Bookmark, CheckCircle2,
  Activity, ArrowLeft, ArrowRight, Trash2, Mail, MailOpen, SlidersHorizontal, X, AlertCircle, RefreshCw, Inbox,
} from "lucide-react";
import { loadUser } from "@/lib/supabase/auth";
import { startPolling } from "@/lib/polling";
import { notifyError } from "@/lib/auth-fetch";
import { subscribeToNotifications } from "@/lib/realtime/subscriptions";
import { NAV_BG, ACCENT, timeAgo, dayGroup } from "@/components/doctor/ui";

interface Notification {
  id: string; type: string; title: string; message: string | null; read: boolean;
  doctor_name?: string | null; action_url?: string | null; ref_id?: string | null; ref_table?: string | null; created_at: string;
}

// One place that describes every category: icon, colours, label
const TYPES: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  new_consultation: { icon: Users, color: "#b45309", bg: "#fffbeb", label: "Consultation request" },
  queue_called: { icon: Users, color: "#b45309", bg: "#fffbeb", label: "Queue" },
  consultation_complete: { icon: CheckCircle2, color: "#0e7490", bg: "#ecfeff", label: "Consultation" },
  chat: { icon: MessageCircle, color: ACCENT, bg: "#effefb", label: "Message" },
  follow_up: { icon: BellRing, color: "#6d28d9", bg: "#f5f3ff", label: "Follow-up" },
  comment: { icon: Activity, color: "#be185d", bg: "#fdf2f8", label: "Post comment" },
  doctor_available: { icon: Zap, color: "#15803d", bg: "#f0fdf4", label: "Availability" },
  saved_doctor_online: { icon: Bookmark, color: "#be123c", bg: "#fff1f2", label: "Saved doctor" },
  system: { icon: ShieldCheck, color: "#475569", bg: "#f1f5f9", label: "System" },
};
const meta = (type: string) => TYPES[type] ?? TYPES.system;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "chat", label: "Messages" },
  { key: "consult", label: "Consultations" },
  { key: "follow_up", label: "Reminders" },
  { key: "other", label: "Other" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];
const CONSULT = ["new_consultation", "queue_called", "consultation_complete"];
const matches = (n: Notification, f: FilterKey) =>
  f === "all" ? true : f === "unread" ? !n.read : f === "chat" ? n.type === "chat" : f === "consult" ? CONSULT.includes(n.type)
    : f === "follow_up" ? n.type === "follow_up" : !["chat", "follow_up", ...CONSULT].includes(n.type);

// Where does "Open" go? Stored links are not always valid, so decide from the type too.
function destinationFor(n: Notification): { href: string; label: string } | null {
  const url = n.action_url ?? "";
  if (url.startsWith("/doctor-dashboard/messages")) return { href: url, label: "Open messages" };
  if (url.startsWith("/doctor-dashboard")) return { href: url, label: url === "/doctor-dashboard" ? "Go to your queue" : "Open" };
  if (url.startsWith("/posts/")) return { href: url, label: "View the post" };
  switch (n.type) {
    case "chat": return { href: "/doctor-dashboard/messages", label: "Open messages" };
    case "follow_up": return n.ref_table === "consultations" && n.ref_id
      ? { href: `/doctor-dashboard/followups/${n.ref_id}`, label: "View follow-up" }
      : { href: "/doctor-dashboard/followups", label: "View follow-ups" };
    case "new_consultation": case "queue_called": return { href: "/doctor-dashboard", label: "Go to your queue" };
    case "consultation_complete": return n.ref_table === "consultations" && n.ref_id
      ? { href: `/doctor-dashboard/history/${n.ref_id}`, label: "View consultation" }
      : { href: "/doctor-dashboard/history", label: "Open history" };
    default: return null;
  }
}

// What the doctor can switch off (consultation requests and system alerts are always on)
const PREF_ROWS = [
  { type: "chat", title: "Messages", text: "When a patient sends you a message." },
  { type: "follow_up", title: "Follow-up reminders", text: "Reminders about scheduled follow-ups." },
  { type: "comment", title: "Post comments", text: "When someone comments on one of your blog posts." },
];

const JSON_HEADERS = { "Content-Type": "application/json" };

function NotificationsInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("id");

  const [items, setItems] = useState<Notification[]>([]);
  const [extra, setExtra] = useState<Notification | null>(null); // a deep-linked notification that is not in the latest page
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const [prefsSql, setPrefsSql] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const autoRead = useRef<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const res = await fetch("/api/notifications?limit=80");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not load notifications");
      setItems(j.data ?? []);
      setError(null);
    } catch (e: any) {
      if (!quiet) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => { const u = await loadUser(); if (u) setUserId(u.id); })();
    load();
    return startPolling(() => load(true), 30000);
  }, [load]);

  // Instant arrival of new notifications
  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(userId, () => load(true));
  }, [userId, load]);

  const selected = useMemo(() => items.find((n) => n.id === selectedId) ?? (extra?.id === selectedId ? extra : null), [items, extra, selectedId]);

  // A link to an older notification: fetch just that one
  useEffect(() => {
    if (!selectedId || loading || items.some((n) => n.id === selectedId)) return;
    (async () => {
      try {
        const res = await fetch(`/api/notifications?id=${selectedId}`);
        const j = await res.json().catch(() => ({}));
        setExtra(res.ok && j.data?.[0] ? j.data[0] : null);
      } catch { setExtra(null); }
    })();
  }, [selectedId, loading, items]);

  // ── Changes (optimistic, with a way back) ──
  const apply = (fn: (list: Notification[]) => Notification[]) => { setItems(fn); setExtra((e) => (e ? fn([e])[0] ?? null : e)); };

  const setRead = async (id: string, read: boolean) => {
    const before = items, beforeExtra = extra;
    apply((l) => l.map((n) => (n.id === id ? { ...n, read } : n)));
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ notifId: id, read }) });
      if (!res.ok) throw new Error();
    } catch { setItems(before); setExtra(beforeExtra); notifyError("Couldn't update the notification. Please try again."); }
  };

  const markAll = async () => {
    const before = items;
    apply((l) => l.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ markAll: true }) });
      if (!res.ok) throw new Error();
    } catch { setItems(before); notifyError("Couldn't mark them as read. Please try again."); }
  };

  const remove = async (id: string) => {
    const before = items;
    setItems((l) => l.filter((n) => n.id !== id)); setExtra(null); setConfirmDelete(false);
    router.replace(pathname, { scroll: false });
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ notifId: id }) });
      if (!res.ok) throw new Error();
    } catch { setItems(before); notifyError("Couldn't delete the notification. Please try again."); }
  };

  const clearRead = async () => {
    const before = items;
    setItems((l) => l.filter((n) => !n.read)); setConfirmClear(false);
    if (selected?.read) router.replace(pathname, { scroll: false });
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ clearRead: true }) });
      if (!res.ok) throw new Error();
    } catch { setItems(before); notifyError("Couldn't clear read notifications. Please try again."); }
  };

  // Opening a notification marks it read (once)
  const open = (id: string) => router.replace(`${pathname}?id=${id}`, { scroll: false });
  useEffect(() => {
    setConfirmDelete(false);
    if (selected && !selected.read && autoRead.current !== selected.id) {
      autoRead.current = selected.id;
      setRead(selected.id, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // ── Preferences ──
  const openPrefs = async () => {
    setPrefsOpen(true);
    try {
      const res = await fetch("/api/notifications/preferences");
      const j = await res.json().catch(() => ({}));
      setMuted(j.data?.mutedTypes ?? []); setPrefsSql(!!j.needsMigration);
    } catch { /* defaults */ }
  };
  const togglePref = async (type: string) => {
    const before = muted;
    const next = muted.includes(type) ? muted.filter((t) => t !== type) : [...muted, type];
    setMuted(next);
    try {
      const res = await fetch("/api/notifications/preferences", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ mutedTypes: next }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not save");
    } catch (e: any) { setMuted(before); notifyError(e.message || "Couldn't save your preference."); }
  };

  const unread = items.filter((n) => !n.read).length;
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter((n) => matches(n, f.key)).length])) as Record<FilterKey, number>, [items]);
  const filtered = items.filter((n) => matches(n, filter));
  const groups = (["Today", "Yesterday", "Earlier"] as const)
    .map((g) => ({ label: g, rows: filtered.filter((n) => dayGroup(n.created_at) === g) }))
    .filter((g) => g.rows.length > 0);
  const hasRead = items.some((n) => n.read);

  const dest = selected ? destinationFor(selected) : null;
  const sm = selected ? meta(selected.type) : null;

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] md:h-[calc(100dvh-9.5rem)] min-h-[460px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* ───── List ───── */}
      <aside className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-[360px] lg:w-[400px] shrink-0 flex-col border-r border-slate-200`}>
        <div className="p-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display font-extrabold text-[18px] text-slate-900">Notifications</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">{unread > 0 ? `${unread} unread` : "You're all caught up"}</p>
            </div>
            <button onClick={openPrefs} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Preferences
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-3">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-[12px] font-bold ${filter === f.key ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} style={filter === f.key ? { background: NAV_BG } : undefined}>
                {f.label}{counts[f.key] > 0 && f.key !== "all" ? <span className="opacity-70"> · {counts[f.key]}</span> : null}
              </button>
            ))}
          </div>
          {(unread > 0 || hasRead) && (
            <div className="flex items-center gap-2 mt-3">
              {unread > 0 && <button onClick={markAll} className="flex items-center gap-1.5 text-[12px] font-bold hover:underline" style={{ color: ACCENT }}><CheckCheck className="w-3.5 h-3.5" /> Mark all read</button>}
              {hasRead && (confirmClear ? (
                <span className="ml-auto flex items-center gap-2 text-[12px]">
                  <span className="text-slate-500">Delete all read?</span>
                  <button onClick={clearRead} className="font-bold text-rose-600">Delete</button>
                  <button onClick={() => setConfirmClear(false)} className="font-semibold text-slate-500">Cancel</button>
                </span>
              ) : <button onClick={() => setConfirmClear(true)} className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /> Clear read</button>)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2 animate-pulse">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[72px] rounded-xl bg-slate-100" />)}</div>
          ) : error ? (
            <div className="text-center py-14 px-6">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-[13px] text-slate-600 mt-2">{error}</p>
              <button onClick={() => load()} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold" style={{ background: ACCENT }}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Inbox className="w-6 h-6 text-slate-300" /></div>
              <p className="text-[14px] font-bold text-slate-700">{filter === "unread" ? "No unread notifications" : "Nothing here yet"}</p>
              <p className="text-[12px] text-slate-400 mt-1">{filter === "all" ? "Patient requests, messages and reminders will show up here." : "Try a different filter."}</p>
            </div>
          ) : groups.map((g) => (
            <div key={g.label}>
              <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label}</p>
              {g.rows.map((n) => {
                const m = meta(n.type), Icon = m.icon, active = n.id === selectedId;
                return (
                  <button key={n.id} onClick={() => open(n.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-l-[3px] transition-colors ${active ? "bg-teal-50 border-teal-600" : "border-transparent hover:bg-slate-50"}`}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.bg }}><Icon className="w-[18px] h-[18px]" style={{ color: m.color }} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-[13.5px] leading-snug ${n.read ? "font-semibold text-slate-700" : "font-extrabold text-slate-900"}`}>{n.title}</span>
                        <span className="text-[10.5px] text-slate-400 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                      </span>
                      {n.message && <span className="block text-[12.5px] text-slate-500 truncate mt-0.5">{n.message}</span>}
                    </span>
                    {!n.read && <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: ACCENT }} aria-label="Unread" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* ───── Detail ───── */}
      <section className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-slate-50`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4"><Bell className="w-7 h-7 text-slate-300" /></div>
            <p className="font-display font-bold text-slate-800">Select a notification</p>
            <p className="text-[13px] text-slate-400 mt-1 max-w-xs">Pick one from the list to read the details and act on it.</p>
          </div>
        ) : !selected || !sm ? (
          <div className="flex-1 flex flex-col">
            <header className="flex items-center gap-3 px-4 h-16 bg-white border-b border-slate-200 md:hidden">
              <button onClick={() => router.replace(pathname, { scroll: false })} aria-label="Back" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              {loading ? <p className="text-[13px] text-slate-400">Loading…</p> : (<>
                <p className="font-display font-bold text-slate-800">This notification isn&apos;t available</p>
                <p className="text-[13px] text-slate-400 mt-1">It may have been deleted.</p>
              </>)}
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 h-16 bg-white border-b border-slate-200 shrink-0">
              <button onClick={() => router.replace(pathname, { scroll: false })} aria-label="Back to notifications" className="md:hidden w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => setRead(selected.id, !selected.read)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:bg-slate-50">
                  {selected.read ? <><Mail className="w-3.5 h-3.5" /> Mark unread</> : <><MailOpen className="w-3.5 h-3.5" /> Mark read</>}
                </button>
                {confirmDelete ? (
                  <span className="flex items-center gap-1.5">
                    <button onClick={() => remove(selected.id)} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[12px] font-bold">Delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} aria-label="Delete notification" className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <article className="max-w-2xl rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: sm.bg }}>{(() => { const Icon = sm.icon; return <Icon className="w-6 h-6" style={{ color: sm.color }} />; })()}</span>
                  <div className="min-w-0">
                    <h3 className="font-display font-extrabold text-[18px] text-slate-900 leading-snug">{selected.title}</h3>
                    <p className="text-[12px] text-slate-400 mt-1" title={new Date(selected.created_at).toLocaleString()}>
                      {timeAgo(selected.created_at)} · {new Date(selected.created_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                {selected.doctor_name && <p className="mt-4 text-[12.5px] text-slate-500">From <span className="font-bold text-slate-700">{selected.doctor_name}</span></p>}
                <p className="mt-4 text-[14.5px] text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.message || "No additional details."}</p>
                {dest && (
                  <Link href={dest.href} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-[13.5px] font-bold" style={{ background: NAV_BG }}>
                    {dest.label} <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </article>
            </div>
          </>
        )}
      </section>

      {/* ───── Preferences ───── */}
      {prefsOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40" onClick={() => setPrefsOpen(false)}>
          <div role="dialog" aria-label="Notification preferences" className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-[17px] text-slate-900">Notification preferences</h3>
              <button onClick={() => setPrefsOpen(false)} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[12.5px] text-slate-400 mt-1">Choose what appears in your notifications. Changes apply to new notifications.</p>
            {prefsSql && <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800">Saving preferences needs a one-time database update. Run the notifications SQL in Supabase.</div>}
            <div className="mt-4 divide-y divide-slate-100">
              {PREF_ROWS.map((r) => {
                const on = !muted.includes(r.type);
                return (
                  <div key={r.type} className="flex items-center gap-4 py-3.5">
                    <div className="flex-1 min-w-0"><p className="text-[14px] font-bold text-slate-800">{r.title}</p><p className="text-[12px] text-slate-400">{r.text}</p></div>
                    <button role="switch" aria-checked={on} aria-label={r.title} onClick={() => togglePref(r.type)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${on ? "bg-teal-600" : "bg-slate-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 py-3.5">
                <div className="flex-1"><p className="text-[14px] font-bold text-slate-800">Consultation requests &amp; system alerts</p><p className="text-[12px] text-slate-400">Always on, so you never miss a patient.</p></div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Always on</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorNotificationsPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={<div className="h-[60vh] rounded-2xl border border-slate-200 bg-white animate-pulse" />}>
      <NotificationsInner />
    </Suspense>
  );
}