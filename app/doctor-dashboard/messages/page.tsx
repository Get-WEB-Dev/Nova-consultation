"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Send, Paperclip, ArrowLeft, Check, CheckCheck, MessageSquare, Plus, X, Star,
  FileText, Loader2, AlertCircle, RefreshCw, Users,
} from "lucide-react";
import { loadUser, type AuthUser } from "@/lib/supabase/auth";
import { startPolling } from "@/lib/polling";
import { subscribeToThreadMessages, subscribeToDoctorInbox } from "@/lib/realtime/subscriptions";
import { SignedImg, SignedLink } from "@/components/media/SignedMedia";
import { Avatar, NAV_BG, ACCENT, timeAgo } from "@/components/doctor/ui";

// ── Types ─────────────────────────────────────────────────────
interface Convo {
  conversationId: string; patientId: string; patientName: string; patientAvatar: string | null;
  lastMessage: string; lastMessageTime: string; unreadCount: number;
}
interface Msg {
  id: string; fromMe: boolean; text: string; createdAt: string; readAt: string | null;
  attachmentUrl?: string | null; attachmentName?: string | null; attachmentType?: string | null;
  state?: "sending" | "failed";
}
interface PatientLite { id: string; name: string; email: string; avatar_url: string | null }
interface Review { id: string; author: string; rating: number; text: string; date: string }

const JSON_HEADERS = { "Content-Type": "application/json" };
const PAGE = 60;

// ── Helpers ───────────────────────────────────────────────────
const toMsg = (r: any, myId: string): Msg => ({
  id: r.id, fromMe: r.sender_id === myId, text: r.body ?? "", createdAt: r.created_at, readAt: r.read_at ?? null,
  attachmentUrl: r.attachment_url, attachmentName: r.attachment_name, attachmentType: r.attachment_type,
});
const byTime = (a: Msg, b: Msg) => +new Date(a.createdAt) - +new Date(b.createdAt);

function mergeRows(prev: Msg[], incoming: Msg[]): Msg[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming) {
    const old = map.get(m.id);
    if (!old) { map.set(m.id, m); changed = true; }
    else if (old.readAt !== m.readAt) { map.set(m.id, { ...old, readAt: m.readAt }); changed = true; }
  }
  return changed ? Array.from(map.values()).sort(byTime) : prev;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
function listTime(iso: string) {
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const y = new Date(); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function dayLabel(iso: string) {
  const d = new Date(iso), now = new Date();
  if (sameDay(d, now)) return "Today";
  const y = new Date(); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

// ── Page ──────────────────────────────────────────────────────
export default function MessagesPage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [convos, setConvos] = useState<Convo[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [convosError, setConvosError] = useState<string | null>(null);
  const [needsSql, setNeedsSql] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [msgsError, setMsgsError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [tab, setTab] = useState<"chats" | "reviews">("chats");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [patients, setPatients] = useState<PatientLite[] | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const selectedRef = useRef<string | null>(null);
  const latestRef = useRef<string | null>(null);
  const stickRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const deepLinked = useRef(false);

  const selected = convos.find((c) => c.conversationId === selectedId) ?? null;

  // ── Who am I? ──
  useEffect(() => {
    (async () => {
      const u = await loadUser();
      if (!u) return;
      setMe(u);
      try {
        const r = await fetch(`/api/doctor/profile?doctorId=${u.id}`);
        const j = await r.json();
        if (j.data?.id) setProfileId(j.data.id);
      } catch { /* realtime inbox is optional — polling still works */ }
    })();
  }, []);

  // ── Conversation list: load, poll, and refresh on any new message ──
  const loadConvos = useCallback(async (uid: string, quiet = false) => {
    if (!quiet) { setConvosLoading(true); setConvosError(null); }
    try {
      const res = await fetch(`/api/conversations?doctorId=${uid}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not load your conversations");
      setConvos(j.data ?? []);
      setNeedsSql(!!j.needsMigration);
      setConvosError(null);
    } catch (e: any) {
      if (!quiet) setConvosError(e.message);
    } finally {
      setConvosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    loadConvos(me.id);
    return startPolling(() => loadConvos(me.id, true), 15000);
  }, [me, loadConvos]);

  useEffect(() => {
    if (!me || !profileId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeToDoctorInbox(profileId, () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => loadConvos(me.id, true), 400); // batch bursts of messages
    });
    return () => { if (t) clearTimeout(t); unsub(); };
  }, [me, profileId, loadConvos]);

  // ── Read receipts ──
  const markRead = useCallback(async (conversationId: string) => {
    setConvos((prev) => prev.map((c) => (c.conversationId === conversationId ? { ...c, unreadCount: 0 } : c)));
    try {
      await fetch("/api/messages/read", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ conversationId }) });
    } catch { /* retried the next time the chat is opened */ }
  }, []);

  // ── Open a conversation ──
  const loadThread = useCallback(async (id: string, myId: string) => {
    setMsgsLoading(true); setMsgsError(null); setMsgs([]); setHasMore(false);
    try {
      const res = await fetch(`/api/messages?conversationId=${id}&limit=${PAGE}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not load this conversation");
      if (selectedRef.current !== id) return; // user already switched chats
      const rows: any[] = j.data ?? [];
      stickRef.current = true;
      setMsgs(rows.map((r) => toMsg(r, myId)));
      setHasMore(rows.length >= PAGE);
    } catch (e: any) {
      if (selectedRef.current === id) setMsgsError(e.message);
    } finally {
      if (selectedRef.current === id) setMsgsLoading(false);
    }
  }, []);

  const openConvo = useCallback((c: Convo) => {
    if (!me) return;
    selectedRef.current = c.conversationId;
    setSelectedId(c.conversationId);
    setDraft("");
    loadThread(c.conversationId, me.id);
    if (c.unreadCount > 0) markRead(c.conversationId);
  }, [me, loadThread, markRead]);

  const closeConvo = () => { selectedRef.current = null; setSelectedId(null); setMsgs([]); };

  // ── Live updates for the open chat: realtime + a polling safety net ──
  useEffect(() => { const real = msgs.filter((m) => !m.state); latestRef.current = real.length ? real[real.length - 1].createdAt : null; }, [msgs]);

  useEffect(() => {
    if (!selectedId || !me) return;
    const id = selectedId, myId = me.id;
    let tick = 0;

    const take = (rows: any[]) => {
      if (selectedRef.current !== id || rows.length === 0) return;
      setMsgs((prev) => mergeRows(prev, rows.map((r) => toMsg(r, myId))));
      if (rows.some((r) => r.sender_id !== myId) && document.visibilityState === "visible") markRead(id);
    };
    const unsub = subscribeToThreadMessages(id, (row) => take([row]));

    const poll = async () => {
      tick++;
      // Every 4th pass re-reads the latest page so "read" ticks on OUR messages update too
      const url = tick % 4 === 0 || !latestRef.current
        ? `/api/messages?conversationId=${id}&limit=${PAGE}`
        : `/api/messages?conversationId=${id}&limit=50&after=${encodeURIComponent(latestRef.current)}`;
      try {
        const res = await fetch(url);
        const j = await res.json().catch(() => ({}));
        if (res.ok) take(j.data ?? []);
      } catch { /* next tick */ }
    };
    const stop = startPolling(poll, 6000);
    return () => { unsub(); stop(); };
  }, [selectedId, me, markRead]);

  // ── Keep the view at the bottom for new messages (unless the doctor scrolled up) ──
  useEffect(() => {
    if (stickRef.current) endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, selectedId]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadOlder = async () => {
    if (!selectedId || !me || loadingOlder) return;
    const oldest = msgs.find((m) => !m.state)?.createdAt;
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${selectedId}&limit=${PAGE}&before=${encodeURIComponent(oldest)}`);
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        const rows: any[] = j.data ?? [];
        stickRef.current = false;
        setMsgs((prev) => mergeRows(prev, rows.map((r) => toMsg(r, me.id))));
        setHasMore(rows.length >= PAGE);
      }
    } finally { setLoadingOlder(false); }
  };

  // ── Sending ──
  const bumpPreview = (conversationId: string, preview: string) =>
    setConvos((prev) => {
      const c = prev.find((x) => x.conversationId === conversationId);
      if (!c) return prev;
      return [{ ...c, lastMessage: preview, lastMessageTime: new Date().toISOString() }, ...prev.filter((x) => x.conversationId !== conversationId)];
    });

  const send = async (retry?: Msg) => {
    const text = (retry ? retry.text : draft).trim();
    if (!text || !selectedId || !me) return;
    const convId = selectedId;
    const tmpId = retry?.id ?? `tmp-${Date.now()}`;
    stickRef.current = true;

    if (retry) setMsgs((prev) => prev.map((m) => (m.id === tmpId ? { ...m, state: "sending" } : m)));
    else {
      setMsgs((prev) => [...prev, { id: tmpId, fromMe: true, text, createdAt: new Date().toISOString(), readAt: null, state: "sending" }]);
      setDraft("");
      if (taRef.current) taRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/messages", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ conversationId: convId, body: text }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.data) throw new Error(j.error || "Message not sent");
      const real = toMsg(j.data, me.id);
      setMsgs((prev) => {
        const rest = prev.filter((m) => m.id !== tmpId);
        return rest.some((m) => m.id === real.id) ? rest : [...rest, real].sort(byTime);
      });
      bumpPreview(convId, text);
    } catch {
      setMsgs((prev) => prev.map((m) => (m.id === tmpId ? { ...m, state: "failed" } : m)));
    }
  };

  const sendFile = async (file: File) => {
    if (!selectedId || !me) return;
    if (file.size > 20 * 1024 * 1024) { setMsgsError("Files can be up to 20 MB."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "chat-attachments");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const uj = await up.json().catch(() => ({}));
      if (!up.ok || !uj.url) throw new Error(uj.error || "Upload failed");
      const kind = String(uj.type ?? "").startsWith("image/") ? "image" : uj.type === "application/pdf" ? "pdf" : "document";
      const res = await fetch("/api/messages", {
        method: "POST", headers: JSON_HEADERS,
        body: JSON.stringify({ conversationId: selectedId, attachmentUrl: uj.url, attachmentName: uj.name, attachmentType: kind, attachmentSize: uj.size }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.data) throw new Error(j.error || "File not sent");
      stickRef.current = true;
      setMsgs((prev) => mergeRows(prev, [toMsg(j.data, me.id)]));
      bumpPreview(selectedId, `Attachment: ${uj.name}`);
    } catch { /* the red error toast already explained what failed */ }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  // ── Start a new chat with one of the doctor's patients ──
  const startChat = useCallback(async (patientId: string) => {
    if (!me) return;
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ patientId }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.data) return; // the red toast shows the server's reason
      const c: Convo = { ...j.data, lastMessage: "", lastMessageTime: new Date().toISOString(), unreadCount: 0 };
      setConvos((prev) => (prev.some((x) => x.conversationId === c.conversationId) ? prev : [c, ...prev]));
      setNewChatOpen(false); setTab("chats");
      openConvo(convos.find((x) => x.conversationId === c.conversationId) ?? c);
    } catch { /* toast already shown */ }
  }, [me, convos, openConvo]);

  const openNewChat = async () => {
    setNewChatOpen(true); setTab("chats");
    if (patients || !me) return;
    try {
      const res = await fetch(`/api/doctor/patients?doctorId=${me.id}`);
      const j = await res.json().catch(() => ({}));
      setPatients(res.ok ? (j.data ?? []).filter(Boolean) : []);
    } catch { setPatients([]); }
  };

  // Deep link: /doctor-dashboard/messages?patient=<id>  (e.g. from the Patients page)
  useEffect(() => {
    if (!me || deepLinked.current) return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get("patient") ?? p.get("contactId");
    if (id) { deepLinked.current = true; startChat(id); }
  }, [me, startChat]);

  // Reviews tab
  useEffect(() => {
    if (tab !== "reviews" || reviews) return;
    (async () => {
      try {
        const res = await fetch("/api/doctor/reviews");
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Could not load reviews");
        setReviews(j.data ?? []);
      } catch (e: any) { setReviewsError(e.message); }
    })();
  }, [tab, reviews]);

  // ── Derived lists ──
  const totalUnread = convos.reduce((n, c) => n + c.unreadCount, 0);
  const visibleConvos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convos.filter((c) => (filter === "all" || c.unreadCount > 0) && (!q || c.patientName.toLowerCase().includes(q)));
  }, [convos, filter, search]);
  const pickList = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    return (patients ?? []).filter((p) => !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  }, [patients, patientSearch]);

  // ── UI ──
  const bubbles = msgs.map((m, i) => {
    const showDay = i === 0 || !sameDay(new Date(msgs[i - 1].createdAt), new Date(m.createdAt));
    return { m, showDay };
  });

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] md:h-[calc(100dvh-9.5rem)] min-h-[460px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* ───────── LEFT: list ───────── */}
      <aside className={`${selected ? "hidden md:flex" : "flex"} w-full md:w-[340px] lg:w-[380px] shrink-0 flex-col border-r border-slate-200`}>
        <div className="p-4 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-extrabold text-[18px] text-slate-900">Messages {totalUnread > 0 && <span className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white align-middle" style={{ background: ACCENT }}>{totalUnread}</span>}</h2>
            <button onClick={openNewChat} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-[12px] font-bold" style={{ background: NAV_BG }}>
              <Plus className="w-3.5 h-3.5" /> New chat
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-3 p-1 rounded-xl bg-slate-100">
            {(["chats", "reviews"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setNewChatOpen(false); }}
                className={`py-1.5 rounded-lg text-[12.5px] font-bold capitalize transition-colors ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t === "chats" ? "Patients" : "Reviews"}</button>
            ))}
          </div>
        </div>

        {tab === "reviews" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {reviewsError ? <p className="text-center text-[13px] text-rose-600 py-10">{reviewsError}</p>
              : !reviews ? <div className="space-y-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-100" />)}</div>
                : reviews.length === 0 ? <p className="text-center text-[13px] text-slate-400 py-12">No reviews yet</p>
                  : reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold text-slate-800">{r.author}</p>
                        <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</span>
                      </div>
                      {r.text && <p className="text-[12.5px] text-slate-600 mt-1.5">{r.text}</p>}
                      <p className="text-[10.5px] text-slate-400 mt-1.5">{timeAgo(r.date)}</p>
                    </div>
                  ))}
          </div>
        ) : newChatOpen ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 flex items-center gap-2 border-b border-slate-100">
              <button onClick={() => setNewChatOpen(false)} aria-label="Cancel" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
              <p className="text-[13px] font-bold text-slate-800">Message a patient</p>
            </div>
            <div className="p-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input autoFocus value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search your patients…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-teal-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {!patients ? <div className="space-y-2 p-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100" />)}</div>
                : pickList.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[13px] font-semibold text-slate-600">{patients.length === 0 ? "No patients yet" : "No match"}</p>
                    <p className="text-[12px] text-slate-400 mt-1">{patients.length === 0 ? "You can message patients after your first consultation with them." : "Try a different name."}</p>
                  </div>
                ) : pickList.map((p) => (
                  <button key={p.id} onClick={() => startChat(p.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 text-left">
                    <Avatar name={p.name} src={p.avatar_url} size={40} />
                    <div className="min-w-0"><p className="text-[13.5px] font-bold text-slate-800 truncate">{p.name}</p><p className="text-[11.5px] text-slate-400 truncate">{p.email}</p></div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 space-y-2.5">
              {needsSql && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[12px] text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> Unread counts need a one-time database update. Run the messages SQL in Supabase.
                </div>
              )}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-teal-500" />
              </div>
              <div className="flex gap-1.5">
                {(["all", "unread"] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-[12px] font-bold capitalize ${filter === f ? "text-white" : "bg-slate-100 text-slate-500"}`} style={filter === f ? { background: NAV_BG } : undefined}>
                    {f}{f === "unread" && totalUnread > 0 ? ` · ${totalUnread}` : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {convosLoading ? (
                <div className="p-3 space-y-2 animate-pulse">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100" />)}</div>
              ) : convosError ? (
                <div className="text-center py-12 px-6">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-[13px] text-slate-600 mt-2">{convosError}</p>
                  <button onClick={() => me && loadConvos(me.id)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold" style={{ background: ACCENT }}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
                </div>
              ) : visibleConvos.length === 0 ? (
                <div className="text-center py-14 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><MessageSquare className="w-6 h-6 text-slate-300" /></div>
                  <p className="text-[14px] font-bold text-slate-700">{convos.length === 0 ? "No conversations yet" : "Nothing matches"}</p>
                  <p className="text-[12px] text-slate-400 mt-1">{convos.length === 0 ? "Start a chat with one of your patients, or wait for a patient to message you." : "Try another search or filter."}</p>
                  {convos.length === 0 && <button onClick={openNewChat} className="mt-4 px-4 py-2 rounded-xl text-white text-[12.5px] font-bold" style={{ background: NAV_BG }}>Start a chat</button>}
                </div>
              ) : visibleConvos.map((c) => {
                const active = c.conversationId === selectedId;
                return (
                  <button key={c.conversationId} onClick={() => openConvo(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-[3px] transition-colors ${active ? "bg-teal-50 border-teal-600" : "border-transparent hover:bg-slate-50"}`}>
                    <Avatar name={c.patientName} src={c.patientAvatar} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[14px] truncate ${c.unreadCount ? "font-extrabold text-slate-900" : "font-semibold text-slate-800"}`}>{c.patientName}</p>
                        <span className="text-[11px] text-slate-400 shrink-0">{listTime(c.lastMessageTime)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[12.5px] truncate ${c.unreadCount ? "text-slate-700 font-semibold" : "text-slate-400"}`}>{c.lastMessage || "No messages yet"}</p>
                        {c.unreadCount > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0" style={{ background: ACCENT }}>{c.unreadCount > 99 ? "99+" : c.unreadCount}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </aside>

      {/* ───────── RIGHT: thread ───────── */}
      <section className={`${selected ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-slate-50`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4"><MessageSquare className="w-7 h-7 text-slate-300" /></div>
            <p className="font-display font-bold text-slate-800">Select a conversation</p>
            <p className="text-[13px] text-slate-400 mt-1 max-w-xs">Choose a patient on the left, or start a new chat.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-4 h-16 bg-white border-b border-slate-200 shrink-0">
              <button onClick={closeConvo} aria-label="Back to conversations" className="md:hidden w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
              <Avatar name={selected.patientName} src={selected.patientAvatar} size={40} />
              <div className="min-w-0">
                <p className="font-display font-bold text-[15px] text-slate-900 truncate">{selected.patientName}</p>
                <p className="text-[12px] text-slate-400">Patient</p>
              </div>
            </header>

            <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4">
              {msgsLoading ? (
                <div className="space-y-3 animate-pulse">{[0, 1, 0, 1].map((r, i) => <div key={i} className={`h-12 w-2/3 rounded-2xl bg-slate-200/70 ${r ? "ml-auto" : ""}`} />)}</div>
              ) : msgsError ? (
                <div className="text-center py-16">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-[13px] text-slate-600 mt-2">{msgsError}</p>
                  <button onClick={() => me && loadThread(selected.conversationId, me.id)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold" style={{ background: ACCENT }}><RefreshCw className="w-3.5 h-3.5" /> Try again</button>
                </div>
              ) : msgs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[14px] font-bold text-slate-700">Say hello to {selected.patientName.split(" ")[0]}</p>
                  <p className="text-[12.5px] text-slate-400 mt-1">Messages are private between you and your patient.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {hasMore && (
                    <div className="text-center pb-2">
                      <button onClick={loadOlder} disabled={loadingOlder} className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                        {loadingOlder ? "Loading…" : "Load earlier messages"}
                      </button>
                    </div>
                  )}
                  {bubbles.map(({ m, showDay }) => (
                    <div key={m.id}>
                      {showDay && <div className="flex justify-center my-3"><span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{dayLabel(m.createdAt)}</span></div>}
                      <div className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[82%] sm:max-w-[70%]">
                          <div className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${m.fromMe ? "text-white rounded-br-md" : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"} ${m.state === "sending" ? "opacity-70" : ""}`} style={m.fromMe ? { background: NAV_BG } : undefined}>
                            {m.attachmentUrl && (m.attachmentType === "image" ? (
                              <SignedLink href={m.attachmentUrl} className="block mb-1.5">
                                <SignedImg src={m.attachmentUrl} alt={m.attachmentName ?? "Image"} className="rounded-lg max-h-64 w-auto object-cover" />
                              </SignedLink>
                            ) : (
                              <SignedLink href={m.attachmentUrl} className={`flex items-center gap-2.5 mb-1.5 p-2.5 rounded-xl ${m.fromMe ? "bg-white/10" : "bg-slate-50 border border-slate-200"}`}>
                                <FileText className="w-5 h-5 shrink-0" />
                                <span className="text-[13px] font-semibold truncate">{m.attachmentName ?? "Document"}</span>
                              </SignedLink>
                            ))}
                            {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10.5px] ${m.fromMe ? "text-white/70" : "text-slate-400"}`}>
                              <span>{clock(m.createdAt)}</span>
                              {m.fromMe && (m.state === "sending" ? <Loader2 className="w-3 h-3 animate-spin" /> : m.readAt ? <CheckCheck className="w-3.5 h-3.5 text-teal-300" /> : <Check className="w-3.5 h-3.5" />)}
                            </div>
                          </div>
                          {m.state === "failed" && (
                            <div className="flex items-center justify-end gap-2 mt-1 text-[11.5px]">
                              <span className="text-rose-600 font-semibold">Not sent</span>
                              <button onClick={() => send(m)} className="font-bold underline" style={{ color: ACCENT }}>Retry</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-slate-200 bg-white p-3 flex items-end gap-2 shrink-0">
              <input ref={fileRef} type="file" hidden accept="image/*,.pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Attach a file"
                className="w-11 h-11 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center shrink-0 disabled:opacity-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <textarea ref={taRef} rows={1} value={draft} maxLength={2000} placeholder="Write a message…"
                onChange={(e) => setDraft(e.target.value)}
                onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-slate-200 text-[14px] outline-none focus:border-teal-500 leading-relaxed max-h-[120px]" />
              <button type="submit" disabled={!draft.trim()} aria-label="Send"
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 disabled:opacity-40" style={{ background: NAV_BG }}>
                <Send className="w-[18px] h-[18px]" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}