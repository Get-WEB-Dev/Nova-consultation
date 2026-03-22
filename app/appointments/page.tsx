"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search, Send, Paperclip, MessageSquare, ChevronLeft,
  Calendar, Bell, Check, CheckCheck, Loader2,
  Clock, Video, BellOff, ChevronRight, ArrowRight,
  Stethoscope, Star, Phone,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { subscribeToDirectMessages, initPresence } from "@/lib/realtime/subscriptions";
import type { ConsultationSession } from "@/lib/types";

type Tab = "messages" | "followups" | "reminders";
interface Msg {
  id: string; from: "me" | "other"; text: string; time: string;
  createdAt?: string; fileUrl?: string; fileName?: string;
  fileType?: "image" | "file"; isPending?: boolean;
}
interface Convo {
  doctorId: string; doctorName: string; doctorAvatar: string;
  doctorSpecialty: string; lastMessage: string; lastMessageTime: string; unreadCount: number;
}
interface FollowUp {
  id: string; doctorId: string; doctorName: string; doctorSpecialty: string;
  doctorAvatar: string; reason: string; lastConversation: string; scheduledAt: string; status: string;
}
interface Reminder {
  id: string; doctorId: string; doctorName: string; doctorAvatar: string; doctorSpecialty: string; createdAt: string;
}

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ConsultationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("messages");
  const [user, setUser] = useState<any>(null);

  const [convos, setConvos] = useState<Convo[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFU, setLoadingFU] = useState(false);
  const [selectedFU, setSelectedFU] = useState<FollowUp | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingRem, setLoadingRem] = useState(false);

  useEffect(() => {
    (async () => {
      let u = getUser(); if (!u) u = await loadUser(); if (!u) return;
      setUser(u); initPresence(u.id);
    })();
  }, []);

  const fetchConvos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/consultations?patientId=${user.id}`);
      const data: ConsultationSession[] = await res.json();
      if (!Array.isArray(data)) return;
      const docMap = new Map<string, ConsultationSession>();
      for (const s of data) { if (!docMap.has(s.doctorId)) docMap.set(s.doctorId, s); }
      const list: Convo[] = await Promise.all(Array.from(docMap.values()).map(async s => {
        try {
          const r = await fetch(`/api/messages?doctorId=${s.doctorId}&patientId=${user.id}`);
          const j = await r.json(); const m: any[] = j.data ?? [];
          const last = m[m.length - 1];
          return {
            doctorId: s.doctorId, doctorName: s.doctorName, doctorAvatar: s.doctorAvatar, doctorSpecialty: s.doctorSpecialty,
            lastMessage: last?.body ?? last?.attachment_name ?? "", lastMessageTime: last?.created_at ?? s.created_at ?? new Date().toISOString(),
            unreadCount: m.filter(x => x.sender_role === "doctor" && !x.read_at).length
          };
        } catch {
          return {
            doctorId: s.doctorId, doctorName: s.doctorName, doctorAvatar: s.doctorAvatar,
            doctorSpecialty: s.doctorSpecialty, lastMessage: "", lastMessageTime: s.created_at ?? new Date().toISOString(), unreadCount: 0
          };
        }
      }));
      setConvos(list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
    } catch { }
    setLoadingConvos(false);
  }, [user]);

  useEffect(() => { if (user) fetchConvos(); }, [user, fetchConvos]);
  useEffect(() => { if (!user) return; const iv = setInterval(() => fetchConvos(), 10000); return () => clearInterval(iv); }, [user, fetchConvos]);

  const fetchMsgs = useCallback(async (convo: Convo, silent = false) => {
    if (!user) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/messages?doctorId=${convo.doctorId}&patientId=${user.id}`);
      const j = await r.json();
      if (j.data) {
        const f: Msg[] = j.data.map((m: any) => ({
          id: m.id, from: m.sender_role === "patient" ? "me" : "other", text: m.body ?? "",
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: m.created_at, fileUrl: m.attachment_url ?? undefined, fileName: m.attachment_name ?? undefined,
          fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
        }));
        setMsgs(prev => { const ids = new Set(f.map(x => x.id)); const pend = prev.filter(m => m.isPending && !ids.has(m.id)); return [...f, ...pend]; });
      }
    } catch { }
    if (!silent) setLoadingMsgs(false);
  }, [user]);

  const openConvo = useCallback((c: Convo) => {
    setSelectedConvo(c); setMsgs([]);
    setConvos(prev => prev.map(x => x.doctorId === c.doctorId ? { ...x, unreadCount: 0 } : x));
  }, []);

  useEffect(() => { if (selectedConvo) fetchMsgs(selectedConvo); }, [selectedConvo, fetchMsgs]);

  useEffect(() => {
    if (!selectedConvo || !user) return;
    const unsub = subscribeToDirectMessages(selectedConvo.doctorId, user.id, (nm) => {
      const f: Msg = {
        id: nm.id, from: nm.sender_role === "patient" ? "me" : "other", text: nm.body ?? "",
        time: new Date(nm.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: nm.created_at, fileUrl: nm.attachment_url ?? undefined, fileName: nm.attachment_name ?? undefined,
        fileType: nm.attachment_type === "image" ? "image" : nm.attachment_url ? "file" : undefined
      };
      setMsgs(prev => {
        if (prev.some(m => m.id === nm.id)) return prev;
        const filtered = prev.filter(m => {
          if (!m.isPending || m.from !== "other") return true;
          return !(m.text === nm.body && Math.abs(Date.now() - new Date(nm.created_at).getTime()) < 10000);
        });
        return [...filtered, f];
      });
    });
    const iv = setInterval(() => fetchMsgs(selectedConvo, true), 3000);
    return () => { unsub(); clearInterval(iv); };
  }, [selectedConvo, user, fetchMsgs]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = useCallback(async () => {
    if (!msgInput.trim() || !selectedConvo || !user) return;
    const text = msgInput.trim(); setMsgInput("");
    const tempId = `opt-${Date.now()}`; const now = new Date();
    setMsgs(prev => [...prev, { id: tempId, from: "me", text, time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), createdAt: now.toISOString(), isPending: true }]);
    try {
      const r = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedConvo.doctorId, patientId: user.id, senderId: user.id, senderRole: "patient", body: text })
      });
      const j = await r.json();
      setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, id: j.data?.id ?? tempId, isPending: false } : m));
      fetchConvos();
    } catch { setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false } : m)); }
  }, [msgInput, selectedConvo, user, fetchConvos]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedConvo || !user) return;
    const isImage = file.type.startsWith("image/"); const tempId = `opt-file-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file); const now = new Date();
    setMsgs(prev => [...prev, { id: tempId, from: "me", text: "", time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), createdAt: now.toISOString(), fileUrl: tempUrl, fileName: file.name, fileType: isImage ? "image" : "file", isPending: true }]);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }); const ud = await up.json();
      const mr = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedConvo.doctorId, patientId: user.id, senderId: user.id, senderRole: "patient", attachmentUrl: ud.url, attachmentName: ud.name ?? file.name, attachmentType: isImage ? "image" : "document", attachmentSize: ud.size ?? file.size })
      });
      const mj = await mr.json();
      URL.revokeObjectURL(tempUrl);
      setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, id: mj.data?.id ?? tempId, fileUrl: ud.url, isPending: false } : m));
      fetchConvos();
    } catch { setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false } : m)); }
    finally { e.target.value = ""; }
  }, [selectedConvo, user, fetchConvos]);

  const fetchFollowUps = useCallback(async () => {
    if (!user) return; setLoadingFU(true);
    try {
      const r = await fetch(`/api/consultations?patientId=${user.id}`); const data: ConsultationSession[] = await r.json();
      if (!Array.isArray(data)) return;
      const items: FollowUp[] = data.filter(s => s.isFollowUp && s.followUpScheduledAt).map(s => ({
        id: s.id, doctorId: s.doctorId, doctorName: s.doctorName, doctorSpecialty: s.doctorSpecialty, doctorAvatar: s.doctorAvatar,
        reason: s.notes ?? (s as any).symptoms ?? "Follow-up", lastConversation: s.summary ?? "", scheduledAt: s.followUpScheduledAt!, status: s.status,
      }));
      const dm = new Map<string, FollowUp>();
      for (const fu of items) { if (!dm.has(fu.doctorId) || new Date(fu.scheduledAt) > new Date(dm.get(fu.doctorId)!.scheduledAt)) dm.set(fu.doctorId, fu); }
      setFollowUps(Array.from(dm.values()).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()));
    } catch { } setLoadingFU(false);
  }, [user]);

  useEffect(() => { if (tab === "followups" && user) fetchFollowUps(); }, [tab, user, fetchFollowUps]);

  const fetchReminders = useCallback(async () => {
    if (!user) return; setLoadingRem(true);
    try {
      const r = await fetch(`/api/consultations?patientId=${user.id}`); const data: ConsultationSession[] = await r.json();
      if (!Array.isArray(data)) return;
      const dids = Array.from(new Set(data.map(s => s.doctorId))); const dm = new Map(data.map(s => [s.doctorId, s]));
      const list: Reminder[] = [];
      for (const dId of dids) {
        try {
          const rr = await fetch(`/api/remind-me?patientId=${user.id}&doctorId=${dId}`); const j = await rr.json();
          if (j.active) { const s = dm.get(dId)!; list.push({ id: `${user.id}-${dId}`, doctorId: dId, doctorName: s.doctorName, doctorAvatar: s.doctorAvatar, doctorSpecialty: s.doctorSpecialty, createdAt: new Date().toISOString() }); }
        } catch { }
      }
      setReminders(list);
    } catch { } setLoadingRem(false);
  }, [user]);

  useEffect(() => { if (tab === "reminders" && user) fetchReminders(); }, [tab, user, fetchReminders]);

  const cancelReminder = async (dId: string) => {
    if (!user) return;
    try { await fetch("/api/remind-me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: user.id, doctorId: dId }) }); } catch { }
    setReminders(prev => prev.filter(r => r.doctorId !== dId));
  };

  const groupedMsgs = useMemo(() => {
    const g: { date: string; items: Msg[] }[] = [];
    msgs.forEach(m => {
      const d = m.createdAt ? new Date(m.createdAt).toDateString() : new Date().toDateString();
      const label = d === new Date().toDateString() ? "Today" : d;
      let grp = g.find(x => x.date === label); if (!grp) { grp = { date: label, items: [] }; g.push(grp); } grp.items.push(m);
    }); return g;
  }, [msgs]);

  const filteredConvos = convos.filter(c => c.doctorName.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = convos.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  const TABS = [
    { key: "messages" as Tab, label: "Messages", icon: MessageSquare, badge: totalUnread },
    { key: "followups" as Tab, label: "Follow Ups", icon: Calendar, badge: 0 },
    { key: "reminders" as Tab, label: "Reminders", icon: Bell, badge: reminders.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 bg-nova-mesh pb-safe">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="sticky top-16 md:top-16 z-10 border-b border-white/40" style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display font-bold text-xl text-slate-800">My Consultations</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage your care journey</p>
            </div>
            <button
              onClick={() => router.push("/doctors")}
              className="btn-primary text-xs px-4 py-2"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Find a Doctor
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0">
            {TABS.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${tab === key
                  ? "border-teal-500 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge > 0 && (
                  <span className={`w-5 h-5 text-[9px] font-bold rounded-full flex items-center justify-center ${tab === key ? "bg-primary-600 text-white" : "bg-rose-500 text-white"
                    }`}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">

        {/* ── MESSAGES TAB ─────────────────────────────────── */}
        {tab === "messages" && (
          <div className="glass-card overflow-hidden"
            style={{ height: "calc(100vh - 14rem)", minHeight: "480px" }}>
            <div className="flex h-full">

              {/* Sidebar */}
              <div className={`${selectedConvo ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 lg:w-80 border-r border-slate-100 flex-shrink-0`}>
                {/* Search */}
                <div className="p-3 border-b border-slate-50">
                  <div className="flex items-center gap-2 bg-slate-50/60 rounded-xl px-3 py-2.5">
                    <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors…"
                      className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none" />
                  </div>
                </div>

                {/* Reviews folder */}
                <button onClick={() => router.push("/appointments/reviews")}
                  className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 hover:bg-amber-50/50 transition-colors group text-left">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">Reviews</p>
                    <p className="text-xs text-slate-400">Your doctor reviews</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors" />
                </button>

                {/* Convos */}
                <div className="flex-1 overflow-y-auto">
                  {loadingConvos ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-primary-400 animate-spin" /></div>
                  ) : filteredConvos.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><MessageSquare className="w-6 h-6 text-slate-400" /></div>
                      <p className="font-semibold text-slate-600 text-sm">No conversations</p>
                      <p className="text-xs text-slate-400 mt-1">Start a consultation to message a doctor</p>
                      <button onClick={() => router.push("/doctors")} className="mt-3 text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
                        Find a Doctor <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : filteredConvos.map(c => (
                    <button key={c.doctorId} onClick={() => openConvo(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 text-left transition-all duration-200 border-b border-slate-50/60 last:border-0 ${selectedConvo?.doctorId === c.doctorId ? "bg-primary-50/50 border-l-2 border-l-teal-500" : ""
                        }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100">
                          <Image src={c.doctorAvatar} alt={c.doctorName} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${c.unreadCount > 0 ? "font-bold text-slate-800" : "font-medium text-slate-700"}`}>{c.doctorName}</p>
                          <span className="text-[11px] text-slate-400 ml-2 flex-shrink-0">{formatRelTime(c.lastMessageTime)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                            {c.lastMessage || c.doctorSpecialty}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-teal-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-2 flex-shrink-0">{c.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat area */}
              {selectedConvo ? (
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
                    <button onClick={() => setSelectedConvo(null)} className="md:hidden p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image src={selectedConvo.doctorAvatar} alt={selectedConvo.doctorName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{selectedConvo.doctorName}</p>
                      <p className="text-xs text-slate-400">{selectedConvo.doctorSpecialty}</p>
                    </div>
                    <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
                      <Video className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,0.5) 0%, rgba(240,253,249,0.2) 100%)' }}>
                    {loadingMsgs ? (
                      <div className="flex justify-center pt-10">
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    ) : msgs.length === 0 ? (
                      <div className="empty-state h-full justify-center">
                        <div className="empty-state-icon"><MessageSquare className="w-6 h-6 text-slate-400" /></div>
                        <p className="text-sm font-medium text-slate-500">No messages yet</p>
                        <p className="text-xs text-slate-400 mt-1">Send a message to start</p>
                      </div>
                    ) : groupedMsgs.map(group => (
                      <div key={group.date} className="space-y-3">
                        <div className="flex justify-center">
                          <span className="text-[10px] font-semibold bg-white/70 backdrop-blur-sm text-slate-500 px-3 py-1 rounded-full shadow-soft">{group.date}</span>
                        </div>
                        {group.items.map(msg => (
                          <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} ${msg.isPending ? "opacity-70" : ""}`}>
                            {msg.from === "other" && (
                              <div className="w-7 h-7 rounded-full overflow-hidden mr-2 mt-1 flex-shrink-0 bg-slate-100">
                                <Image src={selectedConvo.doctorAvatar} alt="" width={28} height={28} className="w-full h-full object-cover" unoptimized />
                              </div>
                            )}
                            <div className={`max-w-[72%] ${msg.from === "me" ? "bubble-me" : "bubble-other"}`}>
                              {msg.fileUrl ? (
                                msg.fileType === "image" ? (
                                  <div className="space-y-1.5">
                                    <img src={msg.fileUrl} alt={msg.fileName ?? "img"} className="rounded-xl max-w-full h-auto max-h-52 object-contain"
                                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                  </div>
                                ) : (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-black/8 dark:bg-white/8 rounded-xl hover:bg-black/12 transition-colors">
                                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-xs truncate max-w-[140px]">{msg.fileName ?? "attachment"}</span>
                                  </a>
                                )
                              ) : (
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.from === "me" ? "text-primary-200" : "text-slate-400"}`}>
                                <span className="text-[10px]">{msg.time}</span>
                                {msg.from === "me" && (msg.isPending ? <Check className="w-3 h-3 opacity-50" /> : <CheckCheck className="w-3 h-3" />)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} accept="image/*,.pdf,.doc,.docx" />
                    <div className="flex items-end gap-2">
                      <div className="flex-1 flex items-center gap-2 bg-slate-50/60 rounded-2xl border border-slate-200/60 px-3.5 py-2.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all duration-200">
                        <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500 transition-colors flex-shrink-0">
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg()}
                          placeholder="Type a message…"
                          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none min-w-0" />
                      </div>
                      <button onClick={sendMsg} disabled={!msgInput.trim()}
                        className="w-11 h-11 bg-gradient-to-br from-primary-600 to-teal-500 rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all duration-200 shadow-sm shadow-teal-500/20 flex-shrink-0">
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,0.5) 0%, rgba(240,253,249,0.2) 100%)' }}>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500">Select a conversation</p>
                    <p className="text-xs text-slate-400 mt-1">Choose a doctor from the list</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FOLLOW UPS TAB ──────────────────────────────── */}
        {tab === "followups" && (
          <div className="space-y-4 animate-fade-up">
            {selectedFU ? (
              <div className="space-y-4">
                <button onClick={() => setSelectedFU(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors font-medium">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="card overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-primary-600 to-teal-500" />
                  <div className="p-6 space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                        <Image src={selectedFU.doctorAvatar} alt={selectedFU.doctorName} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-xl text-slate-800">{selectedFU.doctorName}</h2>
                        <p className="text-primary-600 text-sm font-semibold">{selectedFU.doctorSpecialty}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
                          <Clock className="w-4 h-4" /><span>{formatDate(selectedFU.scheduledAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Reason</p>
                        <p className="text-sm text-slate-700">{selectedFU.reason}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Last conversation</p>
                        <p className="text-sm text-slate-700 line-clamp-3">{selectedFU.lastConversation || "No notes"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setSelectedFU(null); setTab("messages"); const c = convos.find(x => x.doctorId === selectedFU.doctorId); if (c) { setSelectedConvo(c); } }}
                        className="btn-secondary flex-1">
                        <MessageSquare className="w-4 h-4" /> Open Chat
                      </button>
                      <button onClick={() => router.push("/meeting")} className="btn-success flex-1">
                        <Video className="w-4 h-4" /> Join Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg text-slate-800">Follow-up Sessions</h2>
                  <span className="badge-slate">{followUps.length} scheduled</span>
                </div>
                {loadingFU ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
                ) : followUps.length === 0 ? (
                  <div className="card empty-state">
                    <div className="empty-state-icon"><Calendar className="w-6 h-6 text-slate-400" /></div>
                    <p className="font-semibold text-slate-500">No follow-ups scheduled</p>
                    <p className="text-sm text-slate-400 mt-1">Your doctor will schedule follow-ups after consultations</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {followUps.map(fu => (
                      <button key={fu.id} onClick={() => setSelectedFU(fu)}
                        className="card-interactive p-5 text-left group">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                            <Image src={fu.doctorAvatar} alt={fu.doctorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-800">{fu.doctorName}</p>
                            <p className="text-xs text-primary-600 font-medium mt-0.5">{fu.doctorSpecialty}</p>
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" /><span>{formatDate(fu.scheduledAt)}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">{fu.reason}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── REMINDERS TAB ───────────────────────────────── */}
        {tab === "reminders" && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-slate-800">Reminders</h2>
              <span className="badge-slate">{reminders.length} active</span>
            </div>
            {loadingRem ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
            ) : reminders.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon"><Bell className="w-6 h-6 text-slate-400" /></div>
                <p className="font-semibold text-slate-500">No active reminders</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">Set reminders on a doctor&apos;s profile to be notified when they come online</p>
                <button onClick={() => router.push("/doctors")} className="mt-4 text-sm text-primary-600 font-semibold hover:underline flex items-center gap-1 mx-auto">
                  Browse Doctors <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {reminders.map(rem => (
                  <div key={rem.id} className="card-p flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image src={rem.doctorAvatar} alt={rem.doctorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{rem.doctorName}</p>
                      <p className="text-xs text-primary-600 font-medium">{rem.doctorSpecialty}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                        <Bell className="w-3.5 h-3.5" /><span>Notify when online</span>
                      </div>
                    </div>
                    <button onClick={() => cancelReminder(rem.doctorId)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-500 text-xs font-semibold hover:bg-rose-50 transition-colors flex-shrink-0">
                      <BellOff className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}