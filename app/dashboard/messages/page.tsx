"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
    Search, Send, Paperclip, ChevronLeft, MessageSquare,
    Image as Img, MoreVertical, Check, CheckCheck, Loader2,
    Phone, Video, X, File, Clock, Plus,
} from "lucide-react";
import { loadUser, getUser } from "@/lib/supabase/auth";
import {
    subscribeToDirectMessages,
    subscribeToConversations,
    subscribeToPresence,
    initPresence,
} from "@/lib/realtime/subscriptions";

const NAV_BG = "#1a3558";
const ACCENT = "#1e4470";

interface Convo {
    conversationId: string;
    participantId: string;
    participantName: string;
    participantAvatar: string | null;
    participantRole: "patient" | "doctor";
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    online?: boolean;
    participantSpecialty?: string;
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

function ago(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

export default function PatientMessagesPage() {
    const searchParams = useSearchParams();
    const [convos, setConvos] = useState<Convo[]>([]);
    const [selected, setSelected] = useState<Convo | null>(null);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [typing, setTyping] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [autoOpenHandled, setAutoOpenHandled] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            const u = await loadUser();
            setUser(u);
            if (!u) return;
            initPresence(u.id);

            // Load doctor conversations for this patient
            try {
                const res = await fetch(`/api/conversations?patientId=${u.id}`);
                const j = await res.json();
                if (j.data) {
                    setConvos(
                        j.data.map((c: any) => ({
                            conversationId: c.conversationId || c.id,
                            participantId: c.doctor_id || c.doctorId || c.participantId,
                            participantName: c.doctorName || c.participantName || "Doctor",
                            participantAvatar: c.doctorAvatar || c.participantAvatar || null,
                            participantRole: "doctor" as const,
                            participantSpecialty: c.doctorSpecialty || c.participantSpecialty || "",
                            lastMessage: c.lastMessage || c.last_message || "",
                            lastMessageTime: c.lastMessageTime || c.last_message_time || new Date().toISOString(),
                            unreadCount: c.unreadCount || 0,
                            online: c.online,
                        }))
                    );
                }
            } catch { }
            setLoadingConvos(false);

            // Subscribe to real-time
            const unsub1 = subscribeToConversations(u.id, (convo: any) => {
                setConvos((prev) => {
                    const idx = prev.findIndex((c) => c.conversationId === convo.id);
                    const updated: Convo = {
                        conversationId: convo.id,
                        participantId: convo.doctorId || convo.doctor_id,
                        participantName: convo.doctorName || "Doctor",
                        participantAvatar: convo.doctorAvatar || null,
                        participantRole: "doctor",
                        lastMessage: convo.lastMessage || "",
                        lastMessageTime: convo.lastMessageTime || new Date().toISOString(),
                        unreadCount: convo.unreadCount || 0,
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
            return () => { unsub1?.(); };
        })();
    }, []);

    const loadMsgs = useCallback(
        async (convo: Convo) => {
            setSelected(convo);
            setLoadingMsgs(true);
            setMsgs([]);
            try {
                const res = await fetch(`/api/messages?conversationId=${convo.conversationId}`);
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
                    }))
                );
            } catch { }
            setLoadingMsgs(false);
        },
        [user]
    );

    // Auto-open chat when navigating from doctors page with doctorId param
    useEffect(() => {
        if (autoOpenHandled || !user || loadingConvos) return;
        const doctorId = searchParams.get("doctorId");
        const doctorName = searchParams.get("doctorName");
        if (!doctorId) return;

        setAutoOpenHandled(true);

        const existing = convos.find((c) => c.participantId === doctorId);
        if (existing) {
            loadMsgs(existing);
            return;
        }

        const newConvo: Convo = {
            conversationId: "",
            participantId: doctorId,
            participantName: doctorName ? decodeURIComponent(doctorName) : "Doctor",
            participantAvatar: null,
            participantRole: "doctor",
            lastMessage: "",
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
        };

        (async () => {
            try {
                const res = await fetch("/api/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ doctorId, patientId: user.id }),
                });
                if (res.ok) {
                    const j = await res.json();
                    if (j.data?.id || j.data?.conversationId) {
                        newConvo.conversationId = j.data.id || j.data.conversationId;
                    }
                }
            } catch { }

            if (!newConvo.conversationId) {
                newConvo.conversationId = `new-${doctorId}-${Date.now()}`;
            }

            setConvos((prev) => {
                const exists = prev.find((c) => c.participantId === doctorId);
                if (exists) {
                    loadMsgs(exists);
                    return prev;
                }
                return [newConvo, ...prev];
            });
            loadMsgs(newConvo);
        })();
    }, [user, loadingConvos, convos, searchParams, autoOpenHandled, loadMsgs]);

    useEffect(() => {
        if (!selected || !user) return;
        const unsub = subscribeToDirectMessages(
            selected.conversationId, user.id,
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
            }
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
        const pending: Msg = { id: tmpId, from: "me", text, time: "now", status: "sent", isPending: true };
        setMsgs((prev) => [...prev, pending]);

        try {
            const res = await fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: selected.conversationId,
                    doctorId: selected.participantId,
                    patientId: user.id,
                    senderId: user.id,
                    senderRole: "patient",
                    body: text,
                }),
            });
            const j = await res.json();
            setMsgs((prev) =>
                prev.map((m) =>
                    m.id === tmpId ? { ...m, id: j.data?.id || tmpId, isPending: false, status: "delivered" as const } : m
                )
            );
        } catch {
            setMsgs((prev) => prev.map((m) => (m.id === tmpId ? { ...m, isPending: false } : m)));
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
                { id: tmpId, from: "me", text: "", time: "now", status: "sent", fileUrl: previewUrl, fileName: file.name, fileType: isImage ? "image" : "file", isPending: true },
            ]);

            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("bucket", "chat-attachments");
                const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (!uploadRes.ok || !uploadJson.url) throw new Error("Upload failed");

                const msgRes = await fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        conversationId: selected.conversationId,
                        senderId: user.id,
                        senderRole: "patient",
                        attachmentUrl: uploadJson.url,
                        attachmentName: file.name,
                        attachmentType: isImage ? "image" : "document",
                        attachmentSize: file.size,
                    }),
                });
                const msgJson = await msgRes.json();
                setMsgs((prev) =>
                    prev.map((m) =>
                        m.id === tmpId ? { ...m, id: msgJson.data?.id || tmpId, fileUrl: uploadJson.url, isPending: false, status: "delivered" as const } : m
                    )
                );
            } catch {
                setMsgs((prev) => prev.map((m) => (m.id === tmpId ? { ...m, isPending: false } : m)));
            }
            if (fileRef.current) fileRef.current.value = "";
        },
        [selected, user]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    };

    const filteredConvos = convos.filter((c) =>
        c.participantName.toLowerCase().includes(search.toLowerCase())
    );

    const totalUnread = convos.reduce((a, c) => a + c.unreadCount, 0);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
            <div
                className="flex h-[calc(100vh-140px)] bg-white rounded-2xl overflow-hidden border border-slate-200"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
            >
                {/* Sidebar */}
                <div className={`${selected ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 lg:w-72 xl:w-80 border-r border-slate-100 flex-shrink-0`}>
                    <div className="px-4 py-3.5 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-extrabold text-slate-900 text-[15px]">
                                Messages
                                {totalUnread > 0 && (
                                    <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#ef4444" }}>{totalUnread}</span>
                                )}
                            </h2>
                        </div>
                    </div>

                    <div className="px-3 pt-2.5 pb-1.5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input type="text" placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 bg-slate-50 transition-colors" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingConvos ? (
                            <div className="p-3 space-y-2">
                                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
                            </div>
                        ) : filteredConvos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                <MessageSquare className="w-9 h-9 text-slate-200 mb-2" />
                                <p className="font-bold text-slate-500 text-[13px] text-center">No conversations yet</p>
                                <p className="text-[11px] text-slate-400 mt-1 text-center">Message a doctor to start a conversation</p>
                            </div>
                        ) : (
                            <div>
                                {filteredConvos.map((convo) => (
                                    <button key={convo.conversationId} onClick={() => loadMsgs(convo)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 relative ${selected?.conversationId === convo.conversationId ? "bg-blue-50/70" : ""}`}>
                                        <div className="relative flex-shrink-0">
                                            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-[14px]"
                                                style={{ background: NAV_BG }}>{convo.participantName[0]}</div>
                                            {convo.online !== undefined && (
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${convo.online ? "bg-emerald-400" : "bg-slate-300"}`} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <p className={`text-[13px] truncate ${convo.unreadCount > 0 ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                                                    Dr. {convo.participantName}
                                                </p>
                                                <span className="text-[10px] text-slate-400 flex-shrink-0">{ago(convo.lastMessageTime)}</span>
                                            </div>
                                            {convo.participantSpecialty && (
                                                <p className="text-[10px] font-semibold mb-0.5" style={{ color: ACCENT }}>{convo.participantSpecialty}</p>
                                            )}
                                            <p className={`text-[11px] truncate ${convo.unreadCount > 0 ? "text-slate-700 font-semibold" : "text-slate-400"}`}>
                                                {convo.lastMessage || "No messages yet"}
                                            </p>
                                        </div>
                                        {convo.unreadCount > 0 && (
                                            <span className="w-5 h-5 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0"
                                                style={{ background: ACCENT }}>{convo.unreadCount}</span>
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
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white flex-shrink-0"
                            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                            <button onClick={() => setSelected(null)} className="sm:hidden p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-500" />
                            </button>
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold" style={{ background: NAV_BG }}>
                                    {selected.participantName[0]}
                                </div>
                                {selected.online !== undefined && (
                                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${selected.online ? "bg-emerald-400" : "bg-slate-300"}`} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-slate-900 text-[14px]">Dr. {selected.participantName}</p>
                                <p className="text-[11px]" style={{ color: selected.online ? "#16a34a" : "#94a3b8" }}>
                                    {selected.participantSpecialty || (selected.online ? "Online" : "Offline")}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><Video className="w-4 h-4 text-slate-500" /></button>
                                <button className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><Phone className="w-4 h-4 text-slate-500" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "#f8fafc" }}>
                            {loadingMsgs ? (
                                <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                            ) : msgs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <MessageSquare className="w-9 h-9 text-slate-200 mb-2" />
                                    <p className="text-[13px] font-semibold text-slate-400">No messages yet</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Send a message to start the conversation</p>
                                </div>
                            ) : (
                                <>
                                    {msgs.map((msg, i) => {
                                        const isMe = msg.from === "me";
                                        const showAvatar = !isMe && (i === 0 || msgs[i - 1].from !== "other");
                                        return (
                                            <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                                {!isMe && (
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0 mt-auto ${showAvatar ? "opacity-100" : "opacity-0"}`}
                                                        style={{ background: NAV_BG }}>{selected.participantName[0]}</div>
                                                )}
                                                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                                                    {msg.fileUrl && msg.fileType === "image" ? (
                                                        <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ maxWidth: 240 }}>
                                                            <img src={msg.fileUrl} alt="image" className="w-full" />
                                                        </div>
                                                    ) : msg.fileUrl ? (
                                                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border ${isMe ? "border-blue-200 bg-blue-50" : "bg-white border-slate-200"}`}>
                                                            <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                            <span className="text-[12px] font-semibold text-slate-700 truncate max-w-[150px]">{msg.fileName}</span>
                                                        </div>
                                                    ) : (
                                                        <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${isMe ? "text-white rounded-br-sm" : "text-slate-800 bg-white border border-slate-200 rounded-bl-sm"}`}
                                                            style={isMe ? { background: NAV_BG } : {}}>
                                                            {msg.text}
                                                        </div>
                                                    )}
                                                    <div className={`flex items-center gap-1.5 px-1 ${isMe ? "justify-end" : ""}`}>
                                                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                                                        {isMe && (msg.isPending ? (
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
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold" style={{ background: NAV_BG }}>
                                                {selected.participantName[0]}
                                            </div>
                                            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-slate-200 flex gap-1">
                                                {[0, 1, 2].map((i) => (
                                                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div ref={bottomRef} />
                                </>
                            )}
                        </div>

                        <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                                <button onClick={() => fileRef.current?.click()} className="p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0">
                                    <Paperclip className="w-4 h-4 text-slate-400" />
                                </button>
                                <input ref={inputRef} type="text" placeholder="Type a message…" value={input}
                                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors" />
                                <button onClick={sendMsg} disabled={!input.trim()}
                                    className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-all active:scale-95 flex-shrink-0"
                                    style={{ background: input.trim() ? ACCENT : "#cbd5e1" }}>
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="hidden sm:flex flex-1 items-center justify-center bg-slate-50">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#eff6ff" }}>
                                <MessageSquare className="w-7 h-7" style={{ color: ACCENT }} />
                            </div>
                            <p className="font-extrabold text-slate-700 text-[15px]">Select a conversation</p>
                            <p className="text-[12px] text-slate-400 mt-1.5">Choose a doctor conversation to start chatting</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
