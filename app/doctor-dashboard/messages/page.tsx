"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Send,
  Paperclip,
  ChevronLeft,
  MessageSquare,
  Image as Img,
  MoreVertical,
  Check,
  CheckCheck,
  Loader2,
  Star,
  Users,
  UserCheck,
  Phone,
  Video,
  X,
  Smile,
  File,
  Circle,
  Wifi,
  WifiOff,
  Clock,
  Stethoscope,
  Plus,
} from "lucide-react";
import { loadUser, getUser } from "@/lib/supabase/auth";
import {
  subscribeToDirectMessages,
  subscribeToConversations,
  subscribeToPresence,
  initPresence,
} from "@/lib/realtime/subscriptions";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

interface Convo {
  conversationId: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantRole: "patient" | "doctor";
  participantSpecialty?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online?: boolean;
  status?: string;
}

interface Msg {
  id: string;
  from: "me" | "other";
  text: string;
  time: string;
  createdAt?: string;
  status?: "sent" | "delivered" | "read";
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
}

type Tab = "patients" | "doctors" | "reviews";

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

const MOCK_DOCTOR_CONVOS: Convo[] = [];
const MOCK_DOCTOR_MSGS: Msg[] = [];

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>("patients");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [doctorConvos] = useState<Convo[]>(MOCK_DOCTOR_CONVOS);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typing, setTyping] = useState(false);
  const [user, setUser] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const u = await loadUser();
      setUser(u);
      if (!u) return;
      initPresence(u.id);

      // Load patient conversations
      try {
        const res = await fetch(`/api/conversations?doctorId=${u.id}`);
        const j = await res.json();
        if (j.data) {
          setConvos(
            j.data.map((c: any) => ({
              conversationId: c.conversationId || c.id,
              participantId: c.patientId || c.participantId,
              participantName: c.patientName || c.participantName,
              participantAvatar: c.patientAvatar || null,
              participantRole: "patient" as const,
              lastMessage: c.lastMessage || "",
              lastMessageTime: c.lastMessageTime || new Date().toISOString(),
              unreadCount: c.unreadCount || 0,
              online: c.online,
            })),
          );
        }
      } catch { }
      setLoadingConvos(false);

      // Load reviews
      try {
        const res = await fetch(`/api/doctor/reviews?doctorId=${u.id}`);
        const j = await res.json();
        if (j.data) setReviews(j.data);
      } catch { }

      // Subscribe to real-time
      const unsub1 = subscribeToConversations(u.id, (convo: any) => {
        setConvos((prev) => {
          const idx = prev.findIndex((c) => c.conversationId === convo.id);
          const updated: Convo = {
            conversationId: convo.id,
            participantId: convo.patientId,
            participantName: convo.patientName,
            participantAvatar: convo.patientAvatar,
            participantRole: "patient",
            lastMessage: convo.lastMessage,
            lastMessageTime: convo.lastMessageTime,
            unreadCount: convo.unreadCount,
            online: convo.online,
          };
          if (idx >= 0) {
            const n = [...prev];
            n[idx] = updated;
            return n;
          }
          return [updated, ...prev];
        });
      });
      return () => {
        unsub1?.();
      };
    })();
  }, []);

  const loadMsgs = useCallback(
    async (convo: Convo) => {
      setSelected(convo);
      setLoadingMsgs(true);
      setMsgs([]);
      try {
        if (convo.participantRole === "doctor") {
          setMsgs(MOCK_DOCTOR_MSGS);
          setLoadingMsgs(false);
          return;
        }
        const res = await fetch(
          `/api/messages?conversationId=${convo.conversationId}`,
        );
        const j = await res.json();
        setMsgs(
          (j.data || []).map((m: any) => ({
            id: m.id,
            from: m.sender_id === user?.id ? "me" : "other",
            text: m.body || m.content || m.text || "",
            time: ago(m.created_at),
            createdAt: m.created_at,
            status: m.status || "sent",
            fileUrl: m.attachment_url,
            fileName: m.attachment_name,
            fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
          })),
        );
      } catch { }
      setLoadingMsgs(false);
    },
    [user],
  );

  useEffect(() => {
    if (!selected || !user) return;
    if (selected.participantRole === "doctor") return; // mock
    const unsub = subscribeToDirectMessages(
      selected.conversationId,
      user.id,
      (m: any) => {
        setMsgs((prev) => [
          ...prev,
          {
            id: m.id,
            from: m.sender_id === user.id ? "me" : "other",
            text: m.body || m.content || m.text || "",
            time: "now",
            createdAt: m.created_at,
            status: "sent",
            fileUrl: m.attachment_url,
            fileName: m.attachment_name,
            fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
          },
        ]);
      },
    );
    return () => unsub?.();
  }, [selected, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const sendMsg = useCallback(async () => {
    if (!input.trim() || !selected || !user) return;
    const text = input.trim();
    setInput("");
    const tmpId = `tmp-${Date.now()}`;
    const pending: Msg = {
      id: tmpId,
      from: "me",
      text,
      time: "now",
      status: "sent",
      isPending: true,
    };
    setMsgs((prev) => [...prev, pending]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected.conversationId,
          doctorId: undefined,
          patientId: selected.participantId,
          senderId: user.id,
          senderRole: 'doctor',
          body: text,
        }),
      });
      const j = await res.json();
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === tmpId
            ? {
              ...m,
              id: j.data?.id || tmpId,
              isPending: false,
              status: "delivered",
            }
            : m,
        ),
      );
    } catch {
      setMsgs((prev) =>
        prev.map((m) => (m.id === tmpId ? { ...m, isPending: false } : m)),
      );
    }
  }, [input, selected, user]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selected || !user) return;
      const isImage = file.type.startsWith("image/");
      const tmpId = `tmp-file-${Date.now()}`;
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      setMsgs((prev) => [
        ...prev,
        {
          id: tmpId,
          from: "me",
          text: "",
          time: "now",
          status: "sent",
          fileUrl: previewUrl,
          fileName: file.name,
          fileType: isImage ? "image" : "file",
          isPending: true,
        },
      ]);

      // Upload file to Supabase storage
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "chat-attachments");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.url) throw new Error("Upload failed");

        // Send attachment message
        const msgRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: selected.conversationId,
            senderId: user.id,
            senderRole: "doctor",
            attachmentUrl: uploadJson.url,
            attachmentName: file.name,
            attachmentType: isImage ? "image" : "document",
            attachmentSize: file.size,
          }),
        });
        const msgJson = await msgRes.json();
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === tmpId
              ? { ...m, id: msgJson.data?.id || tmpId, fileUrl: uploadJson.url, isPending: false, status: "delivered" as const }
              : m,
          ),
        );
      } catch (err) {
        console.error("File upload error:", err);
        setMsgs((prev) =>
          prev.map((m) => (m.id === tmpId ? { ...m, isPending: false } : m)),
        );
      }

      // Reset file input
      if (fileRef.current) fileRef.current.value = "";
    },
    [selected, user],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMsg();
    }
  };

  const activeConvos =
    tab === "patients" ? convos : tab === "doctors" ? doctorConvos : [];
  const filteredConvos = activeConvos.filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUnread =
    convos.reduce((a, c) => a + c.unreadCount, 0) +
    doctorConvos.reduce((a, c) => a + c.unreadCount, 0);

  return (
    <div
      className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)] bg-white rounded-2xl overflow-hidden border border-slate-200"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
    >
      {/* Sidebar */}
      <div
        className={`${selected ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 lg:w-72 xl:w-80 border-r border-slate-100 flex-shrink-0`}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-slate-900 text-[15px]">
              Messages
              {totalUnread > 0 && (
                <span
                  className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "#ef4444" }}
                >
                  {totalUnread}
                </span>
              )}
            </h2>
            <button className="p-1.5 rounded-xl hover:bg-slate-50">
              <Plus className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-0.5 rounded-xl bg-slate-100">
            {(["patients", "doctors", "reviews"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelected(null);
                }}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all"
                style={
                  tab === t
                    ? {
                      background: "white",
                      color: NAV_BG,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                    }
                    : { color: "#64748b" }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-2.5 pb-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${tab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* Convo list */}
        <div className="flex-1 overflow-y-auto">
          {tab === "reviews" ? (
            <div className="p-3 space-y-2">
              {reviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400">No reviews yet</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-[13px] text-slate-800">
                        {r.author}
                      </p>
                      <StarRating rating={r.rating} />
                    </div>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      {r.text}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{r.date}</p>
                  </div>
                ))
              )}
            </div>
          ) : loadingConvos ? (
            <div className="p-3 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <MessageSquare className="w-9 h-9 text-slate-200 mb-2" />
              <p className="font-bold text-slate-500 text-[13px] text-center">
                No {tab} conversations
              </p>
              {tab === "doctors" && (
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  Message colleagues from the Doctor Directory
                </p>
              )}
            </div>
          ) : (
            <div>
              {filteredConvos.map((convo) => (
                <button
                  key={convo.conversationId}
                  onClick={() => loadMsgs(convo)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 relative ${selected?.conversationId === convo.conversationId ? "bg-blue-50/70" : ""}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-[14px]"
                      style={{
                        background:
                          convo.participantRole === "doctor"
                            ? "#7c3aed"
                            : NAV_BG,
                      }}
                    >
                      {convo.participantName[0]}
                    </div>
                    {convo.online !== undefined && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${convo.online ? "bg-emerald-400" : "bg-slate-300"}`}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className={`text-[13px] truncate ${convo.unreadCount > 0 ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}
                      >
                        {convo.participantRole === "doctor" ? "Dr. " : ""}
                        {convo.participantName}
                      </p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {ago(convo.lastMessageTime)}
                      </span>
                    </div>
                    {convo.participantSpecialty && (
                      <p
                        className="text-[10px] font-semibold mb-0.5"
                        style={{ color: "#7c3aed" }}
                      >
                        {convo.participantSpecialty}
                      </p>
                    )}
                    <p
                      className={`text-[11px] truncate ${convo.unreadCount > 0 ? "text-slate-700 font-semibold" : "text-slate-400"}`}
                    >
                      {convo.lastMessage || "No messages yet"}
                    </p>
                  </div>

                  {convo.unreadCount > 0 && (
                    <span
                      className="w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0"
                      style={{ background: ACCENT }}
                    >
                      {convo.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white flex-shrink-0"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <button
              onClick={() => setSelected(null)}
              className="sm:hidden p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold"
                style={{
                  background:
                    selected.participantRole === "doctor" ? "#7c3aed" : NAV_BG,
                }}
              >
                {selected.participantName[0]}
              </div>
              {selected.online !== undefined && (
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${selected.online ? "bg-emerald-400" : "bg-slate-300"}`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-slate-900 text-[14px]">
                {selected.participantRole === "doctor" ? "Dr. " : ""}
                {selected.participantName}
              </p>
              <p
                className="text-[11px]"
                style={{ color: selected.online ? "#16a34a" : "#94a3b8" }}
              >
                {selected.participantSpecialty ||
                  (selected.online ? "Online" : "Offline")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Video className="w-4 h-4 text-slate-500" />
              </button>
              <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Phone className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ background: "#f8fafc" }}
          >
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            ) : msgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <MessageSquare className="w-9 h-9 text-slate-200 mb-2" />
                <p className="text-[13px] font-semibold text-slate-400">
                  No messages yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Send a message to start the conversation
                </p>
              </div>
            ) : (
              <>
                {msgs.map((msg, i) => {
                  const isMe = msg.from === "me";
                  const showAvatar =
                    !isMe && (i === 0 || msgs[i - 1].from !== "other");
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe && (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0 mt-auto ${showAvatar ? "opacity-100" : "opacity-0"}`}
                          style={{ background: NAV_BG }}
                        >
                          {selected.participantName[0]}
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}
                      >
                        {msg.fileUrl && msg.fileType === "image" ? (
                          <div
                            className="rounded-2xl overflow-hidden border border-slate-200"
                            style={{ maxWidth: 240 }}
                          >
                            <img
                              src={msg.fileUrl}
                              alt="image"
                              className="w-full"
                            />
                          </div>
                        ) : msg.fileUrl ? (
                          <div
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border ${isMe ? "border-blue-200 bg-blue-50" : "bg-white border-slate-200"}`}
                          >
                            <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-[12px] font-semibold text-slate-700 truncate max-w-[150px]">
                              {msg.fileName}
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${isMe
                              ? "text-white rounded-br-sm"
                              : "text-slate-800 bg-white border border-slate-200 rounded-bl-sm"
                              }`}
                            style={isMe ? { background: NAV_BG } : {}}
                          >
                            {msg.text}
                          </div>
                        )}
                        <div
                          className={`flex items-center gap-1.5 px-1 ${isMe ? "justify-end" : ""}`}
                        >
                          <span className="text-[10px] text-slate-400">
                            {msg.time}
                          </span>
                          {isMe &&
                            (msg.isPending ? (
                              <Clock className="w-2.5 h-2.5 text-slate-300" />
                            ) : msg.status === "read" ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-300" />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex gap-2 items-end">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold"
                      style={{ background: NAV_BG }}
                    >
                      {selected.participantName[0]}
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-slate-200 flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFile}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <Paperclip className="w-4 h-4 text-slate-400" />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={sendMsg}
                disabled={!input.trim()}
                className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-all active:scale-95 flex-shrink-0"
                style={{ background: input.trim() ? ACCENT : "#cbd5e1" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#eff6ff" }}
            >
              <MessageSquare className="w-7 h-7" style={{ color: ACCENT }} />
            </div>
            <p className="font-extrabold text-slate-700 text-[15px]">
              Select a conversation
            </p>
            <p className="text-[12px] text-slate-400 mt-1.5">
              Choose from your patient or doctor conversations
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
