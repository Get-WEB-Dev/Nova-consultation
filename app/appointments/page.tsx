"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Send,
  Paperclip,
  MessageSquare,
  ChevronLeft,
  Calendar,
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Clock,
  Video,
  BellOff,
  ChevronRight,
  ArrowRight,
  Stethoscope,
  Star,
  Phone,
  X,
  Zap,
  Users,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import {
  subscribeToDirectMessages,
  initPresence,
} from "@/lib/realtime/subscriptions";
import type { ConsultationSession } from "@/lib/types";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#1a3558";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

type Tab = "messages" | "followups" | "reminders";

interface Msg {
  id: string;
  from: "me" | "other";
  text: string;
  time: string;
  createdAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "file";
  isPending?: boolean;
}
interface Convo {
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}
interface FollowUp {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  reason: string;
  lastConversation: string;
  scheduledAt: string;
  status: string;
}
interface Reminder {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
  createdAt: string;
}

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      let u = getUser();
      if (!u) u = await loadUser();
      if (!u) return;
      setUser(u);
      initPresence(u.id);
    })();
  }, []);

  const fetchConvos = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/consultations?patientId=${user.id}`);
      const data: ConsultationSession[] = await res.json();
      if (!Array.isArray(data)) return;
      const docMap = new Map<string, ConsultationSession>();
      for (const s of data) {
        if (!docMap.has(s.doctorId)) docMap.set(s.doctorId, s);
      }
      const list: Convo[] = await Promise.all(
        Array.from(docMap.values()).map(async (s) => {
          try {
            const r = await fetch(
              `/api/messages?doctorId=${s.doctorId}&patientId=${user.id}`,
            );
            const j = await r.json();
            const m: any[] = j.data ?? [];
            const last = m[m.length - 1];
            return {
              doctorId: s.doctorId,
              doctorName: s.doctorName,
              doctorAvatar: s.doctorAvatar,
              doctorSpecialty: s.doctorSpecialty,
              lastMessage: last?.body ?? last?.attachment_name ?? "",
              lastMessageTime:
                last?.created_at ?? s.created_at ?? new Date().toISOString(),
              unreadCount: m.filter(
                (x) => x.sender_role === "doctor" && !x.read_at,
              ).length,
            };
          } catch {
            return {
              doctorId: s.doctorId,
              doctorName: s.doctorName,
              doctorAvatar: s.doctorAvatar,
              doctorSpecialty: s.doctorSpecialty,
              lastMessage: "",
              lastMessageTime: s.created_at ?? new Date().toISOString(),
              unreadCount: 0,
            };
          }
        }),
      );
      setConvos(
        list.sort(
          (a, b) =>
            new Date(b.lastMessageTime).getTime() -
            new Date(a.lastMessageTime).getTime(),
        ),
      );
    } catch { }
    setLoadingConvos(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchConvos();
  }, [user, fetchConvos]);
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => fetchConvos(), 10000);
    return () => clearInterval(iv);
  }, [user, fetchConvos]);

  const fetchMsgs = useCallback(
    async (convo: Convo, silent = false) => {
      if (!user) return;
      if (!silent) setLoadingMsgs(true);
      try {
        const r = await fetch(
          `/api/messages?doctorId=${convo.doctorId}&patientId=${user.id}`,
        );
        const j = await r.json();
        if (j.data) {
          const f: Msg[] = j.data.map((m: any) => ({
            id: m.id,
            from: m.sender_role === "patient" ? "me" : "other",
            text: m.body ?? "",
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            createdAt: m.created_at,
            fileUrl: m.attachment_url ?? undefined,
            fileName: m.attachment_name ?? undefined,
            fileType:
              m.attachment_type === "image"
                ? "image"
                : m.attachment_url
                  ? "file"
                  : undefined,
          }));
          setMsgs((prev) => {
            const ids = new Set(f.map((x) => x.id));
            const pend = prev.filter((m) => m.isPending && !ids.has(m.id));
            return [...f, ...pend];
          });
        }
      } catch { }
      if (!silent) setLoadingMsgs(false);
    },
    [user],
  );

  const openConvo = useCallback((c: Convo) => {
    setSelectedConvo(c);
    setMsgs([]);
    setConvos((prev) =>
      prev.map((x) =>
        x.doctorId === c.doctorId ? { ...x, unreadCount: 0 } : x,
      ),
    );
  }, []);

  useEffect(() => {
    if (selectedConvo) fetchMsgs(selectedConvo);
  }, [selectedConvo, fetchMsgs]);

  useEffect(() => {
    if (!selectedConvo || !user) return;
    const unsub = subscribeToDirectMessages(
      selectedConvo.doctorId,
      user.id,
      (nm) => {
        const f: Msg = {
          id: nm.id,
          from: nm.sender_role === "patient" ? "me" : "other",
          text: nm.body ?? "",
          time: new Date(nm.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: nm.created_at,
          fileUrl: nm.attachment_url ?? undefined,
          fileName: nm.attachment_name ?? undefined,
          fileType:
            nm.attachment_type === "image"
              ? "image"
              : nm.attachment_url
                ? "file"
                : undefined,
        };
        setMsgs((prev) => {
          if (prev.some((m) => m.id === nm.id)) return prev;
          const filtered = prev.filter((m) => {
            if (!m.isPending || m.from !== "other") return true;
            return !(
              m.text === nm.body &&
              Math.abs(Date.now() - new Date(nm.created_at).getTime()) < 10000
            );
          });
          return [...filtered, f];
        });
      },
    );
    const iv = setInterval(() => fetchMsgs(selectedConvo, true), 3000);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [selectedConvo, user, fetchMsgs]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const sendMsg = useCallback(async () => {
    if (!msgInput.trim() || !selectedConvo || !user) return;
    const text = msgInput.trim();
    setMsgInput("");
    const tempId = `opt-${Date.now()}`;
    const now = new Date();
    setMsgs((prev) => [
      ...prev,
      {
        id: tempId,
        from: "me",
        text,
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: now.toISOString(),
        isPending: true,
      },
    ]);
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedConvo.doctorId,
          patientId: user.id,
          senderId: user.id,
          senderRole: "patient",
          body: text,
        }),
      });
      const j = await r.json();
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: j.data?.id ?? tempId, isPending: false }
            : m,
        ),
      );
      fetchConvos();
    } catch {
      setMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, isPending: false } : m)),
      );
    }
  }, [msgInput, selectedConvo, user, fetchConvos]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedConvo || !user) return;
      const isImage = file.type.startsWith("image/");
      const tempId = `opt-file-${Date.now()}`;
      const tempUrl = URL.createObjectURL(file);
      const now = new Date();
      setMsgs((prev) => [
        ...prev,
        {
          id: tempId,
          from: "me",
          text: "",
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: now.toISOString(),
          fileUrl: tempUrl,
          fileName: file.name,
          fileType: isImage ? "image" : "file",
          isPending: true,
        },
      ]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await up.json();
        const mr = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: selectedConvo.doctorId,
            patientId: user.id,
            senderId: user.id,
            senderRole: "patient",
            attachmentUrl: ud.url,
            attachmentName: ud.name ?? file.name,
            attachmentType: isImage ? "image" : "document",
            attachmentSize: ud.size ?? file.size,
          }),
        });
        const mj = await mr.json();
        URL.revokeObjectURL(tempUrl);
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                ...m,
                id: mj.data?.id ?? tempId,
                fileUrl: ud.url,
                isPending: false,
              }
              : m,
          ),
        );
        fetchConvos();
      } catch {
        setMsgs((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, isPending: false } : m)),
        );
      } finally {
        e.target.value = "";
      }
    },
    [selectedConvo, user, fetchConvos],
  );

  const fetchFollowUps = useCallback(async () => {
    if (!user) return;
    setLoadingFU(true);
    try {
      const r = await fetch(`/api/consultations?patientId=${user.id}`);
      const data: ConsultationSession[] = await r.json();
      if (!Array.isArray(data)) return;
      const items: FollowUp[] = data
        .filter((s) => s.isFollowUp && s.followUpScheduledAt)
        .map((s) => ({
          id: s.id,
          doctorId: s.doctorId,
          doctorName: s.doctorName,
          doctorSpecialty: s.doctorSpecialty,
          doctorAvatar: s.doctorAvatar,
          reason: s.notes ?? (s as any).symptoms ?? "Follow-up",
          lastConversation: s.summary ?? "",
          scheduledAt: s.followUpScheduledAt!,
          status: s.status,
        }));
      const dm = new Map<string, FollowUp>();
      for (const fu of items) {
        if (
          !dm.has(fu.doctorId) ||
          new Date(fu.scheduledAt) > new Date(dm.get(fu.doctorId)!.scheduledAt)
        )
          dm.set(fu.doctorId, fu);
      }
      setFollowUps(
        Array.from(dm.values()).sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        ),
      );
    } catch { }
    setLoadingFU(false);
  }, [user]);

  useEffect(() => {
    if (tab === "followups" && user) fetchFollowUps();
  }, [tab, user, fetchFollowUps]);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    setLoadingRem(true);
    try {
      const r = await fetch(`/api/consultations?patientId=${user.id}`);
      const data: ConsultationSession[] = await r.json();
      if (!Array.isArray(data)) return;
      const dids = Array.from(new Set(data.map((s) => s.doctorId)));
      const dm = new Map(data.map((s) => [s.doctorId, s]));
      const list: Reminder[] = [];
      for (const dId of dids) {
        try {
          const rr = await fetch(
            `/api/remind-me?patientId=${user.id}&doctorId=${dId}`,
          );
          const j = await rr.json();
          if (j.active) {
            const s = dm.get(dId)!;
            list.push({
              id: `${user.id}-${dId}`,
              doctorId: dId,
              doctorName: s.doctorName,
              doctorAvatar: s.doctorAvatar,
              doctorSpecialty: s.doctorSpecialty,
              createdAt: new Date().toISOString(),
            });
          }
        } catch { }
      }
      setReminders(list);
    } catch { }
    setLoadingRem(false);
  }, [user]);

  useEffect(() => {
    if (tab === "reminders" && user) fetchReminders();
  }, [tab, user, fetchReminders]);

  const cancelReminder = async (dId: string) => {
    if (!user) return;
    try {
      await fetch("/api/remind-me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: user.id, doctorId: dId }),
      });
    } catch { }
    setReminders((prev) => prev.filter((r) => r.doctorId !== dId));
  };

  const groupedMsgs = useMemo(() => {
    const g: { date: string; items: Msg[] }[] = [];
    msgs.forEach((m) => {
      const d = m.createdAt
        ? new Date(m.createdAt).toDateString()
        : new Date().toDateString();
      const label = d === new Date().toDateString() ? "Today" : d;
      let grp = g.find((x) => x.date === label);
      if (!grp) {
        grp = { date: label, items: [] };
        g.push(grp);
      }
      grp.items.push(m);
    });
    return g;
  }, [msgs]);

  const filteredConvos = convos.filter((c) =>
    c.doctorName.toLowerCase().includes(search.toLowerCase()),
  );
  const totalUnread = convos.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  const TABS = [
    {
      key: "messages" as Tab,
      label: "Messages",
      icon: MessageSquare,
      badge: totalUnread,
    },
    { key: "followups" as Tab, label: "Follow Ups", icon: Calendar, badge: 0 },
    {
      key: "reminders" as Tab,
      label: "Reminders",
      icon: Bell,
      badge: reminders.length,
    },
  ];

  return (
    <div className="min-h-screen pb-10" style={{ background: "#eef2f7" }}>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div style={{ background: NAV_BG }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="font-extrabold text-white text-[18px] sm:text-[20px]">
                My Consultations
              </h1>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Manage your care journey
              </p>
            </div>
            <button
              onClick={() => router.push("/doctors")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-extrabold text-white transition-all active:scale-95"
              style={{ background: SKY, color: "#0c192c" }}
            >
              <Stethoscope className="w-3.5 h-3.5" /> Find Doctor
            </button>
          </div>

          {/* Tab bar */}
          <div
            className="flex gap-0 border-b"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            {TABS.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 px-5 py-3 text-[13px] font-semibold border-b-2 transition-all"
                style={
                  tab === key
                    ? { borderBottomColor: SKY, color: "white" }
                    : {
                      borderBottomColor: "transparent",
                      color: "rgba(255,255,255,0.55)",
                    }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge > 0 && (
                  <span
                    className="w-4 h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center"
                    style={{
                      background: tab === key ? SKY : "#ef4444",
                      color: tab === key ? "#0c192c" : "white",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5">
        {/* ══ MESSAGES TAB ══════════════════════════════════════════════ */}
        {tab === "messages" && (
          <div
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
            style={{
              height: "calc(100vh - 13rem)",
              minHeight: 500,
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex h-full">
              {/* ── Sidebar ── */}
              <div
                className={`${selectedConvo ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 lg:w-80 border-r border-slate-100 flex-shrink-0`}
              >
                {/* Sidebar header */}
                <div
                  className="px-4 py-3 border-b border-slate-100 flex-shrink-0"
                  style={{ background: "#f8fafc" }}
                >
                  <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 focus-within:border-blue-300 transition-colors">
                    <Search
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: ACCENT }}
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search doctors…"
                      className="flex-1 text-[13px] font-medium outline-none placeholder:text-slate-400"
                      style={{ color: "#1e293b" }}
                    />
                    {search && (
                      <button onClick={() => setSearch("")}>
                        <X className="w-3.5 h-3.5 text-slate-300" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reviews quick link */}
                <button
                  onClick={() => router.push("/appointments/reviews")}
                  className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group flex-shrink-0"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#fef3c7" }}
                  >
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-700">
                      My Reviews
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Your doctor feedback
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto">
                  {loadingConvos ? (
                    <div className="flex justify-center py-10">
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        style={{ color: ACCENT }}
                      />
                    </div>
                  ) : filteredConvos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: "#eff6ff" }}
                      >
                        <MessageSquare
                          className="w-5 h-5"
                          style={{ color: ACCENT }}
                        />
                      </div>
                      <p className="font-bold text-slate-600 text-[13px]">
                        No conversations yet
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">
                        Start a consultation to message a doctor
                      </p>
                      <button
                        onClick={() => router.push("/doctors")}
                        className="text-[11px] font-bold flex items-center gap-1"
                        style={{ color: ACCENT }}
                      >
                        Find a Doctor <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    filteredConvos.map((c) => {
                      const isActive = selectedConvo?.doctorId === c.doctorId;
                      return (
                        <button
                          key={c.doctorId}
                          onClick={() => openConvo(c)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-slate-50 last:border-0"
                          style={
                            isActive
                              ? {
                                background: "#eff6ff",
                                borderLeft: `3px solid ${ACCENT}`,
                              }
                              : {}
                          }
                          onMouseEnter={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = "#f8fafc";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive)
                              e.currentTarget.style.background = "";
                          }}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100">
                              <Image
                                src={c.doctorAvatar}
                                alt={c.doctorName}
                                width={44}
                                height={44}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                            {/* Unread dot */}
                            {c.unreadCount > 0 && (
                              <span
                                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                                style={{ background: "#ef4444" }}
                              />
                            )}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p
                                className={`text-[13px] truncate ${c.unreadCount > 0 ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}
                              >
                                {c.doctorName}
                              </p>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">
                                {formatRelTime(c.lastMessageTime)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p
                                className={`text-[11px] truncate ${c.unreadCount > 0 ? "font-medium text-slate-600" : "text-slate-400"}`}
                              >
                                {c.lastMessage || c.doctorSpecialty}
                              </p>
                              {c.unreadCount > 0 && (
                                <span
                                  className="w-5 h-5 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: ACCENT }}
                                >
                                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Chat area ── */}
              {selectedConvo ? (
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Chat header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0"
                    style={{ background: NAV_BG }}
                  >
                    <button
                      onClick={() => setSelectedConvo(null)}
                      className="md:hidden p-1.5 rounded-xl text-white/70 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {/* Avatar */}
                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-blue-400 border-2 border-white/20">
                      <Image
                        src={selectedConvo.doctorAvatar}
                        alt={selectedConvo.doctorName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[13px] text-white truncate">
                        {selectedConvo.doctorName}
                      </p>
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: "rgba(255,255,255,0.6)" }}
                      >
                        {selectedConvo.doctorSpecialty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          router.push(`/doctor/${selectedConvo.doctorId}`)
                        }
                        className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        title="View Profile"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/meeting?doctorId=${selectedConvo.doctorId}`,
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all active:scale-95"
                        style={{ background: SKY, color: "#0c192c" }}
                      >
                        <Video className="w-3.5 h-3.5" /> Video
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
                    style={{ background: "#f8fafc" }}
                  >
                    {loadingMsgs ? (
                      <div className="flex justify-center py-10">
                        <Loader2
                          className="w-5 h-5 animate-spin"
                          style={{ color: ACCENT }}
                        />
                      </div>
                    ) : groupedMsgs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                          style={{ background: "#eff6ff" }}
                        >
                          <MessageSquare
                            className="w-6 h-6"
                            style={{ color: ACCENT }}
                          />
                        </div>
                        <p className="font-bold text-slate-600">
                          Start the conversation
                        </p>
                        <p className="text-[12px] text-slate-400 mt-1">
                          Send a message to {selectedConvo.doctorName}
                        </p>
                      </div>
                    ) : (
                      groupedMsgs.map((group) => (
                        <div key={group.date}>
                          {/* Date divider */}
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-bold text-slate-400 px-2">
                              {group.date}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>

                          <div className="space-y-3">
                            {group.items.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex items-end gap-2 ${msg.from === "me" ? "flex-row-reverse" : "flex-row"} ${msg.isPending ? "opacity-70" : ""}`}
                              >
                                {/* Doctor avatar */}
                                {msg.from === "other" && (
                                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border-2 border-white shadow-sm">
                                    <Image
                                      src={selectedConvo.doctorAvatar}
                                      alt=""
                                      width={28}
                                      height={28}
                                      className="w-full h-full object-cover"
                                      unoptimized
                                    />
                                  </div>
                                )}

                                {/* Bubble */}
                                <div
                                  className={`max-w-[72%] rounded-2xl shadow-sm ${msg.from === "me" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                                  style={
                                    msg.from === "me"
                                      ? { background: NAV_BG }
                                      : {
                                        background: "white",
                                        border: "1px solid #e2e8f0",
                                      }
                                  }
                                >
                                  {msg.fileType === "image" && msg.fileUrl ? (
                                    <div className="p-1.5">
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName ?? "img"}
                                        className="rounded-xl max-w-full max-h-52 object-contain block"
                                        onError={(e) =>
                                        ((
                                          e.target as HTMLImageElement
                                        ).style.display = "none")
                                        }
                                      />
                                      {msg.text && (
                                        <p className="text-[13px] text-white px-2 pt-1 pb-1 leading-relaxed">
                                          {msg.text}
                                        </p>
                                      )}
                                      <p
                                        className={`text-[10px] px-2 pb-1.5 ${msg.from === "me" ? "text-white/50 text-right" : "text-slate-400"}`}
                                      >
                                        {msg.time}
                                      </p>
                                    </div>
                                  ) : msg.fileType === "file" && msg.fileUrl ? (
                                    <div className="px-3 py-2.5">
                                      <a
                                        href={msg.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 ${msg.from === "me" ? "bg-white/15" : "bg-slate-100"}`}
                                      >
                                        <Paperclip
                                          className="w-3.5 h-3.5 flex-shrink-0"
                                          style={{
                                            color:
                                              msg.from === "me"
                                                ? "white"
                                                : ACCENT,
                                          }}
                                        />
                                        <span
                                          className="text-[11px] font-medium truncate max-w-[130px]"
                                          style={{
                                            color:
                                              msg.from === "me"
                                                ? "white"
                                                : "#334155",
                                          }}
                                        >
                                          {msg.fileName ?? "attachment"}
                                        </span>
                                      </a>
                                      <p
                                        className={`text-[10px] text-right ${msg.from === "me" ? "text-white/50" : "text-slate-400"}`}
                                      >
                                        {msg.time}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="px-3.5 py-2.5">
                                      <p
                                        className="text-[13px] font-medium leading-relaxed break-words"
                                        style={{
                                          color:
                                            msg.from === "me"
                                              ? "white"
                                              : "#1e293b",
                                        }}
                                      >
                                        {msg.text}
                                      </p>
                                      <div
                                        className={`flex items-center gap-1 mt-1 ${msg.from === "me" ? "justify-end" : ""}`}
                                      >
                                        <span
                                          className="text-[10px]"
                                          style={{
                                            color:
                                              msg.from === "me"
                                                ? "rgba(255,255,255,0.5)"
                                                : "#94a3b8",
                                          }}
                                        >
                                          {msg.time}
                                        </span>
                                        {msg.from === "me" &&
                                          (msg.isPending ? (
                                            <Check className="w-3 h-3 opacity-50 text-white" />
                                          ) : (
                                            <CheckCheck
                                              className="w-3 h-3"
                                              style={{ color: SKY }}
                                            />
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={msgEndRef} />
                  </div>

                  {/* Input bar */}
                  <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFile}
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-blue-300 focus-within:bg-white transition-all">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <input
                          value={msgInput}
                          onChange={(e) => setMsgInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && !e.shiftKey && sendMsg()
                          }
                          placeholder="Type a message…"
                          className="flex-1 text-[13px] font-medium bg-transparent outline-none placeholder:text-slate-400"
                          style={{ color: "#1e293b" }}
                        />
                      </div>
                      <button
                        onClick={sendMsg}
                        disabled={!msgInput.trim()}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-30"
                        style={{
                          background: msgInput.trim() ? NAV_BG : "#e2e8f0",
                        }}
                      >
                        <Send
                          className="w-4 h-4"
                          style={{
                            color: msgInput.trim() ? "white" : "#94a3b8",
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div
                  className="hidden md:flex flex-1 flex-col items-center justify-center"
                  style={{ background: "#f8fafc" }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "#eff6ff" }}
                  >
                    <MessageSquare
                      className="w-7 h-7"
                      style={{ color: ACCENT }}
                    />
                  </div>
                  <p className="font-extrabold text-slate-700">
                    Select a conversation
                  </p>
                  <p className="text-[12px] text-slate-400 mt-1 mb-5">
                    Choose a doctor from the list to start chatting
                  </p>
                  <button
                    onClick={() => router.push("/doctors")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all active:scale-95"
                    style={{ background: NAV_BG }}
                  >
                    <Stethoscope className="w-4 h-4" /> Find a Doctor
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ FOLLOW UPS TAB ════════════════════════════════════════════ */}
        {tab === "followups" && (
          <div className="space-y-4">
            {selectedFU ? (
              /* Detail view */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedFU(null)}
                  className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                  style={{ color: ACCENT }}
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Follow-ups
                </button>

                <div
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
                >
                  {/* Accent bar */}
                  <div
                    className="h-1.5"
                    style={{
                      background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT}, ${SKY})`,
                    }}
                  />
                  <div className="p-5 space-y-5">
                    {/* Doctor info row */}
                    <div className="flex items-start gap-4">
                      <div
                        className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
                        }}
                      >
                        <Image
                          src={selectedFU.doctorAvatar}
                          alt={selectedFU.doctorName}
                          fill
                          className="object-cover object-top"
                          unoptimized
                        />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-[17px]">
                          {selectedFU.doctorName}
                        </h2>
                        <p
                          className="text-[12px] font-semibold mt-0.5"
                          style={{ color: ACCENT }}
                        >
                          {selectedFU.doctorSpecialty}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[12px] text-slate-500">
                          <Clock
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: ACCENT }}
                          />
                          <span>{formatDate(selectedFU.scheduledAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <p
                          className="text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                          style={{ color: ACCENT }}
                        >
                          Reason
                        </p>
                        <p className="text-[13px] text-slate-700">
                          {selectedFU.reason}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-4"
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <p
                          className="text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                          style={{ color: ACCENT }}
                        >
                          Last Conversation
                        </p>
                        <p className="text-[13px] text-slate-700 line-clamp-3">
                          {selectedFU.lastConversation || "No notes"}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => {
                          setSelectedFU(null);
                          setTab("messages");
                          const c = convos.find(
                            (x) => x.doctorId === selectedFU.doctorId,
                          );
                          if (c) setSelectedConvo(c);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all active:scale-95"
                      >
                        <MessageSquare className="w-4 h-4" /> Open Chat
                      </button>
                      <button
                        onClick={() => router.push("/meeting")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all active:scale-95"
                        style={{ background: NAV_BG }}
                      >
                        <Video className="w-4 h-4" /> Join Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* List view */
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-[16px]">
                      Follow-up Sessions
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {followUps.length} scheduled
                    </p>
                  </div>
                </div>

                {loadingFU ? (
                  <div className="flex justify-center py-12">
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: ACCENT }}
                    />
                  </div>
                ) : followUps.length === 0 ? (
                  <div
                    className="bg-white border border-slate-200 rounded-2xl p-12 text-center"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: "#eff6ff" }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <p className="font-bold text-slate-600">
                      No follow-ups scheduled
                    </p>
                    <p className="text-[12px] text-slate-400 mt-1">
                      Your doctor will schedule follow-ups after consultations
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {followUps.map((fu) => (
                      <button
                        key={fu.id}
                        onClick={() => setSelectedFU(fu)}
                        className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md transition-all group active:scale-[0.99]"
                        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                            style={{
                              background:
                                "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
                            }}
                          >
                            <Image
                              src={fu.doctorAvatar}
                              alt={fu.doctorName}
                              fill
                              className="object-cover object-top"
                              unoptimized
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-[13px] text-slate-900">
                              {fu.doctorName}
                            </p>
                            <p
                              className="text-[11px] font-semibold mt-0.5"
                              style={{ color: ACCENT }}
                            >
                              {fu.doctorSpecialty}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                              <Clock
                                className="w-3 h-3 flex-shrink-0"
                                style={{ color: ACCENT }}
                              />
                              <span>{formatDate(fu.scheduledAt)}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                              {fu.reason}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ REMINDERS TAB ═════════════════════════════════════════════ */}
        {tab === "reminders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 text-[16px]">
                  Reminders
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {reminders.length} active
                </p>
              </div>
            </div>

            {loadingRem ? (
              <div className="flex justify-center py-12">
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: ACCENT }}
                />
              </div>
            ) : reminders.length === 0 ? (
              <div
                className="bg-white border border-slate-200 rounded-2xl p-12 text-center"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#eff6ff" }}
                >
                  <Bell className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <p className="font-bold text-slate-600">No active reminders</p>
                <p className="text-[12px] text-slate-400 mt-1 mb-4 max-w-xs mx-auto">
                  Set a reminder on a doctor's profile to be notified when they
                  come online
                </p>
                <button
                  onClick={() => router.push("/doctors")}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-xl text-white transition-all active:scale-95"
                  style={{ background: NAV_BG }}
                >
                  Browse Doctors <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <div
                      className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
                      }}
                    >
                      <Image
                        src={rem.doctorAvatar}
                        alt={rem.doctorName}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[13px] text-slate-900">
                        {rem.doctorName}
                      </p>
                      <p
                        className="text-[11px] font-semibold mt-0.5"
                        style={{ color: ACCENT }}
                      >
                        {rem.doctorSpecialty}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-400">
                        <Bell className="w-3 h-3" style={{ color: ACCENT }} />
                        <span>Notify when online</span>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelReminder(rem.doctorId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 flex-shrink-0"
                      style={{
                        borderColor: "#fecaca",
                        color: "#ef4444",
                        background: "#fff1f2",
                      }}
                    >
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
