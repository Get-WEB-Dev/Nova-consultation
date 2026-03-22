"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Search, Send, Paperclip, ChevronLeft, MessageSquare,
  Image as Img, MoreVertical, Check, CheckCheck, Phone, Video, Loader2, Star
} from "lucide-react";
import { loadUser, getUser } from "@/lib/supabase/auth";
import {
  subscribeToDirectMessages,
  subscribeToConversations,
  subscribeToPresence,
  initPresence,
} from "@/lib/realtime/subscriptions";

interface Convo {
  conversationId: string;
  patientId: string;
  patientName: string;
  patientAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online?: boolean;
}

interface Msg {
  id: string;
  from: "me" | "other";
  text: string;
  time: string;
  createdAt?: string;
  status?: "sent" | "read";
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "file";
  isPending?: boolean;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  avatar: string;
}

type SidebarTab = "patients" | "doctors" | "reviews";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

export default function MessagesPage() {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("patients");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [doctorUserId, setDoctorUserId] = useState<string | null>(null);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let user = getUser();
      if (!user) user = await loadUser();
      if (!user) return;
      setDoctorUserId(user.id);
      const cleanup = initPresence(user.id);
      return cleanup;
    })();
  }, []);

  useEffect(() => {
    if (!doctorUserId) return;
    fetch(`/api/doctor/profile?doctorId=${doctorUserId}`)
      .then(r => r.json())
      .then(d => { if (d.data?.id) setDoctorProfileId(d.data.id); })
      .catch(() => {});
  }, [doctorUserId]);

  const fetchConvos = useCallback(async () => {
    const dId = doctorProfileId || doctorUserId;
    if (!dId) return;
    try {
      const res = await fetch(`/api/conversations?doctorId=${dId}`);
      const json = await res.json();
      if (json.data) setConvos(json.data);
    } catch {}
    setLoadingConvos(false);
  }, [doctorProfileId, doctorUserId]);

  useEffect(() => { fetchConvos(); }, [fetchConvos]);

  const fetchReviews = useCallback(async () => {
    const dId = doctorProfileId || doctorUserId;
    if (!dId) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?doctorId=${dId}`);
      const json = await res.json();
      if (json.data) setReviews(json.data);
    } catch {}
    setLoadingReviews(false);
  }, [doctorProfileId, doctorUserId]);

  useEffect(() => {
    if (sidebarTab === "reviews") fetchReviews();
  }, [sidebarTab, fetchReviews]);

  // Realtime + polling fallback for conversations
  useEffect(() => {
    const dId = doctorProfileId || doctorUserId;
    if (!dId) return;
    const unsub = subscribeToConversations(dId, () => fetchConvos());
    const interval = setInterval(() => fetchConvos(), 10000);
    return () => { unsub(); clearInterval(interval); };
  }, [doctorProfileId, doctorUserId, fetchConvos]);

  useEffect(() => {
    const unsub = subscribeToPresence((ids) => setOnlineUserIds(new Set(ids)));
    return unsub;
  }, []);

  const fetchMsgs = useCallback(async (convo: Convo, silent = false) => {
    const dId = doctorProfileId || doctorUserId;
    if (!dId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages?doctorId=${dId}&patientId=${convo.patientId}`);
      const json = await res.json();
      if (json.data) {
        const formatted: Msg[] = json.data.map((m: any) => ({
          id: m.id,
          from: m.sender_role === "doctor" ? "me" : "other",
          text: m.body ?? "",
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: m.created_at,
          status: "read",
          fileUrl: m.attachment_url ?? undefined,
          fileName: m.attachment_name ?? undefined,
          fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
        }));
        setMsgs(prev => {
          const serverIds = new Set(formatted.map(m => m.id));
          const pending = prev.filter(m => m.isPending && !serverIds.has(m.id));
          return [...formatted, ...pending];
        });
      }
    } catch {}
    if (!silent) setLoadingMsgs(false);
  }, [doctorProfileId, doctorUserId]);

  const openConvo = useCallback((convo: Convo) => {
    setSelected(convo);
    setMsgs([]);
    setConvos(prev => prev.map(c =>
      c.patientId === convo.patientId ? { ...c, unreadCount: 0 } : c
    ));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchMsgs(selected);
  }, [selected, fetchMsgs]);

  // Realtime + polling fallback for messages
  useEffect(() => {
    const dId = doctorProfileId || doctorUserId;
    if (!selected || !dId) return;

    const unsub = subscribeToDirectMessages(dId, selected.patientId, (newMsg) => {
      const formatted: Msg = {
        id: newMsg.id,
        from: newMsg.sender_role === "doctor" ? "me" : "other",
        text: newMsg.body ?? "",
        time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: newMsg.created_at,
        status: "read",
        fileUrl: newMsg.attachment_url ?? undefined,
        fileName: newMsg.attachment_name ?? undefined,
        fileType: newMsg.attachment_type === "image" ? "image" : newMsg.attachment_url ? "file" : undefined,
      };
      setMsgs(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        const filtered = prev.filter(m => {
          if (!m.isPending || m.from !== "me") return true;
          const ageDiff = Math.abs(Date.now() - new Date(newMsg.created_at).getTime());
          return !(m.text === newMsg.body && ageDiff < 10000);
        });
        return [...filtered, formatted];
      });
      fetchConvos();
    });

    const interval = setInterval(() => fetchMsgs(selected, true), 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [selected, doctorProfileId, doctorUserId, fetchConvos, fetchMsgs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; items: Msg[] }[] = [];
    msgs.forEach((m) => {
      const d = m.createdAt ? new Date(m.createdAt).toDateString() : new Date().toDateString();
      const label = d === new Date().toDateString() ? "Today" : d;
      let group = groups.find(g => g.date === label);
      if (!group) { group = { date: label, items: [] }; groups.push(group); }
      group.items.push(m);
    });
    return groups;
  }, [msgs]);

  const send = useCallback(async () => {
    const dId = doctorProfileId || doctorUserId;
    if (!input.trim() || !selected || !dId || !doctorUserId) return;
    const msgText = input.trim();
    setInput("");

    const tempId = `opt-${Date.now()}`;
    const now = new Date();
    setMsgs(prev => [...prev, {
      id: tempId, from: "me", text: msgText,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now.toISOString(), status: "sent", isPending: true,
    }]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: dId, patientId: selected.patientId,
          senderId: doctorUserId, senderRole: "doctor", body: msgText,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      const json = await res.json();
      setMsgs(prev => prev.map(m => m.id === tempId ? {
        ...m, id: json.data?.id ?? tempId, status: "read", isPending: false,
      } : m));
      fetchConvos();
    } catch {
      setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false } : m));
    }
  }, [input, selected, doctorProfileId, doctorUserId, fetchConvos]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const dId = doctorProfileId || doctorUserId;
    if (!file || !selected || !dId || !doctorUserId) return;

    const isImage = file.type.startsWith("image/");
    const tempId = `opt-file-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);
    const now = new Date();

    setMsgs(prev => [...prev, {
      id: tempId, from: "me", text: "",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now.toISOString(), status: "sent",
      fileUrl: tempUrl, fileName: file.name,
      fileType: isImage ? "image" : "file", isPending: true,
    }]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const msgRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: dId, patientId: selected.patientId,
          senderId: doctorUserId, senderRole: "doctor",
          attachmentUrl: uploadData.url,
          attachmentName: uploadData.name ?? file.name,
          attachmentType: isImage ? "image" : "document",
          attachmentSize: uploadData.size ?? file.size,
        }),
      });
      const msgJson = await msgRes.json();
      URL.revokeObjectURL(tempUrl);
      setMsgs(prev => prev.map(m => m.id === tempId ? {
        ...m, id: msgJson.data?.id ?? tempId,
        fileUrl: uploadData.url, isPending: false, status: "read",
      } : m));
      fetchConvos();
    } catch {
      setMsgs(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false } : m));
    } finally {
      e.target.value = "";
    }
  }, [selected, doctorProfileId, doctorUserId, fetchConvos]);

  const filteredConvos = convos.filter(c =>
    c.patientName.toLowerCase().includes(search.toLowerCase())
  );
  const totalUnread = convos.reduce((s, c) => s + (c.unreadCount ?? 0), 0);

  return (
    <div className="animate-fade-up">
      <h1 className="font-bold text-xl text-slate-800 dark:text-white mb-4 lg:hidden">
        Messages
        {totalUnread > 0 && (
          <span className="ml-2 text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>
        )}
      </h1>

      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden"
        style={{ height: "calc(100vh - 9.5rem)", minHeight: "400px" }}
      >
        <div className="flex h-full">
          {/* Sidebar */}
          <div className={`${selected && sidebarTab === "patients" ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-72 xl:w-80 border-r border-slate-100 dark:border-slate-700 flex-shrink-0`}>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
              {(["patients", "doctors", "reviews"] as SidebarTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setSidebarTab(tab); if (tab !== "patients") setSelected(null); }}
                  className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${
                    sidebarTab === tab
                      ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50/50 dark:bg-primary-900/10"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {tab}
                  {tab === "patients" && totalUnread > 0 && (
                    <span className="ml-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full inline-flex items-center justify-center">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            {sidebarTab !== "reviews" && (
              <div className="px-3 py-2.5 border-b border-slate-50 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={sidebarTab === "patients" ? "Search patients…" : "Search doctors…"}
                    className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* List content */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">

              {sidebarTab === "patients" && (
                loadingConvos ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                  </div>
                ) : filteredConvos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400">No patient conversations yet</p>
                  </div>
                ) : filteredConvos.map(c => {
                  const isOnline = onlineUserIds.has(c.patientId);
                  const isSelected = selected?.patientId === c.patientId;
                  return (
                    <button
                      key={c.patientId}
                      onClick={() => openConvo({ ...c, online: isOnline })}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${isSelected ? "bg-primary-50 dark:bg-primary-900/20 border-l-[3px] border-primary-500" : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        {c.patientAvatar ? (
                          <img src={c.patientAvatar} alt={c.patientName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{c.patientName[0]}</span>
                          </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${c.unreadCount > 0 ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>{c.patientName}</p>
                          <span className="text-[11px] text-slate-400 ml-2 flex-shrink-0">{formatRelativeTime(c.lastMessageTime)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-slate-600 dark:text-slate-300 font-medium" : "text-slate-400 dark:text-slate-500"}`}>
                            {c.lastMessage || "No messages yet"}
                          </p>
                          {c.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-2 flex-shrink-0">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              {sidebarTab === "doctors" && (
                <div className="flex flex-col items-center justify-center h-full p-6">
                  <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-400 text-center">Doctor-to-doctor messaging</p>
                  <p className="text-xs text-slate-300 mt-1 text-center">Coming soon</p>
                </div>
              )}

              {sidebarTab === "reviews" && (
                loadingReviews ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <Star className="w-10 h-10 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400">No reviews yet</p>
                  </div>
                ) : reviews.map(r => (
                  <div key={r.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <img src={r.avatar} alt={r.author} className="w-9 h-9 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{r.author}</p>
                          <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{formatRelativeTime(r.date)}</span>
                        </div>
                        <StarRating rating={r.rating} />
                        {r.text && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{r.text}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          {selected && sidebarTab === "patients" ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                <button onClick={() => setSelected(null)} className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {selected.patientAvatar ? (
                    <img src={selected.patientAvatar} alt={selected.patientName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{selected.patientName[0]}</span>
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${onlineUserIds.has(selected.patientId) ? "bg-emerald-400" : "bg-slate-300"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{selected.patientName}</p>
                  <p className="text-xs text-slate-400">{onlineUserIds.has(selected.patientId) ? "Online now" : "Offline"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Phone className="w-4 h-4" /></button>
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500"><Video className="w-4 h-4" /></button>
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><MoreVertical className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                {loadingMsgs ? (
                  <div className="flex justify-center pt-8">
                    <div className="flex gap-1.5">
                      {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <MessageSquare className="w-10 h-10 text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400">No messages yet</p>
                  </div>
                ) : groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <div className="flex justify-center my-2">
                      <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 px-3 py-1 rounded-full uppercase tracking-wider">{group.date}</span>
                    </div>
                    {group.items.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} ${msg.isPending ? "opacity-70" : ""}`}>
                        {msg.from === "other" && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                            <span className="text-white text-xs font-bold">{selected.patientName[0]}</span>
                          </div>
                        )}
                        <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${msg.from === "me"
                          ? "bg-primary-600 text-white rounded-br-sm shadow-sm"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-sm border border-slate-100 dark:border-slate-600"
                        }`}>
                          {msg.fileUrl ? (
                            msg.fileType === "image" ? (
                              <div className="space-y-1">
                                <img src={msg.fileUrl} alt={msg.fileName ?? "image"} className="rounded-lg max-w-full h-auto max-h-60 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                              </div>
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors">
                                <Paperclip className="w-4 h-4 flex-shrink-0" />
                                <span className="text-xs truncate max-w-[150px]">{msg.fileName ?? "attachment"}</span>
                              </a>
                            )
                          ) : (
                            <p className="leading-relaxed">{msg.text}</p>
                          )}
                          <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.from === "me" ? "text-primary-200" : "text-slate-400"}`}>
                            <span className="text-[10px]">{msg.time}</span>
                            {msg.from === "me" && (
                              msg.isPending ? <Check className="w-3 h-3 opacity-50" /> :
                              msg.status === "read" ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-end gap-2 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5">
                    <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500 pb-0.5 flex-shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                      placeholder="Type a message…"
                      className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none min-w-0"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500 pb-0.5 flex-shrink-0">
                      <Img className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={send} disabled={!input.trim()}
                    className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 flex-shrink-0 shadow-sm">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/40 dark:bg-slate-800/40">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-700 shadow-card flex items-center justify-center mx-auto mb-3 border border-slate-100 dark:border-slate-600">
                  {sidebarTab === "reviews" ? <Star className="w-7 h-7 text-slate-300" /> : <MessageSquare className="w-7 h-7 text-slate-300" />}
                </div>
                <p className="font-medium text-slate-500 text-sm">
                  {sidebarTab === "reviews" ? "Reviews shown in the sidebar" : "Select a conversation"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sidebarTab === "doctors" ? "Doctor messaging coming soon" : "Choose from the list to start messaging"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}