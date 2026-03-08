"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import OnboardingGuide from "@/components/ui/OnboardingGuide";
import { useRouter } from "next/navigation";
import {
  History, Calendar, ChevronRight, X, Send, Paperclip, ArrowLeft,
  Clock, Video, FileText, Star, MessageCircle, Users, Zap, Bell,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import type { ConsultationSession, ChatMessage } from "@/lib/types";
import { getUser } from "@/lib/supabase/auth";

type Tab = "active" | "history";
type Lang = "en" | "am";

const T = {
  en: {
    title: "My Consultations", subtitle: "Your consultation sessions",
    active: "Upcoming & Active", history: "History",
    noActive: "No upcoming consultations", noHistory: "No past consultations",
    findDoctor: "Find a Doctor",
    followUp: "Follow-up Session",
    joinNow: "Join Now",
    joinIn: "Join in",
    scheduled: "Doctor-scheduled",
    viewDetails: "View Details",
    back: "Back",
    summary: "Consultation Summary", chatHistory: "Chat History",
    noSummary: "No summary available.", noChatHistory: "No chat history.",
    openChat: "Open Chat",
    rateConsultation: "Rate this Consultation",
    duration: "Duration",
    minutes: "min",
  },
  am: {
    title: "ምክክሮቼ", subtitle: "የምክክር ሴሽኖችዎ",
    active: "መጪ እና ንቁ", history: "ታሪክ",
    noActive: "መጪ ምክክሮች የሉም", noHistory: "ያለፉ ምክክሮች የሉም",
    findDoctor: "ዶክተር ፈልግ",
    followUp: "የክትትል ሴሽን",
    joinNow: "አሁን ይቀላቀሉ",
    joinIn: "ውስጥ ይቀላቀሉ",
    scheduled: "በዶክተር የተቀጠረ",
    viewDetails: "ዝርዝር ይመልከቱ",
    back: "ተመለስ",
    summary: "የምክክር ማጠቃለያ", chatHistory: "የውይይት ታሪክ",
    noSummary: "ምንም ማጠቃለያ የለም።", noChatHistory: "ምንም የወሬ ታሪክ የለም።",
    openChat: "ውይይት ክፈት",
    rateConsultation: "ምክክሩን ይገምቱ",
    duration: "ጊዜ",
    minutes: "ደቂቃ",
  },
} as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ConsultationsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<Tab>("active");
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailSession, setDetailSession] = useState<ConsultationSession | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSession, setChatSession] = useState<ConsultationSession | null>(null);
  const [messages, setMessages] = useState<(ChatMessage & { fileUrl?: string; fileName?: string; fileType?: string })[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = T[lang];

  useEffect(() => {
    const stored = localStorage.getItem("hc-lang") as Lang | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  useEffect(() => {
    async function loadSessions() {
      try {
        // Get user — loadUser hydrates the cache if not yet loaded
        let user = getUser();
        if (!user) {
          const { loadUser: lu } = await import("@/lib/supabase/auth");
          user = await lu();
        }
        if (!user) { setLoading(false); return; }

        const res = await fetch(`/api/consultations?patientId=${user.id}`);
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
    const handler = () => loadSessions();
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  const grouped = useMemo(() => ({
    active: sessions.filter((s) => s.status === "follow_up" || s.status === "active" || s.status === "waiting"),
    history: sessions.filter((s) => s.status === "completed" || s.status === "missed"),
  }), [sessions]);

  const handleJoin = (session: ConsultationSession) => {
    router.push(`/meeting?doctor=${encodeURIComponent(session.doctorName)}&avatar=${encodeURIComponent(session.doctorAvatar)}`);
  };

  const handleChat = async (session: ConsultationSession) => {
    setChatSession(session);
    setMessages([]);
    setChatOpen(true);

    // Load real message history from Supabase
    try {
      const res = await fetch(`/api/messages?consultationId=${session.id}`);
      if (res.ok) {
        const json = await res.json();
        const msgs = (json.data ?? []).map((m: any) => ({
          id:   m.id,
          from: m.sender_role === "patient" ? "me" : "doctor",
          text: m.body ?? "",
          time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        }));
        if (msgs.length === 0) {
          setMessages([{ id: `init-${session.id}`, from: "doctor", text: `Hi, this is ${session.doctorName}. How can I help you?`, time: "Now" }]);
        } else {
          setMessages(msgs);
        }
      }
    } catch {
      setMessages([{ id: `init-${session.id}`, from: "doctor", text: `Hi, this is ${session.doctorName}. How can I help you?`, time: "Now" }]);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !chatSession) return;
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const localMsg = { id: `m-${Date.now()}`, from: "me" as const, text: newMsg.trim(), time: now };
    setMessages((prev) => [...prev, localMsg]);
    const text = newMsg.trim();
    setNewMsg("");

    // Persist message to Supabase
    const user = getUser();
    if (user) {
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: chatSession.id,
            senderId: user.id,
            senderRole: "patient",
            body: text,
          }),
        });
      } catch { /* optimistic — UI already updated */ }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setMessages((prev) => [...prev, { id: `f-${Date.now()}`, from: "me", fileUrl: url, fileName: file.name, fileType: file.type.startsWith("image/") ? "image" : "file", text: "", time: now }]);
    e.target.value = "";
  };

  // ── Detail view ──
  if (detailSession) {
    return (
      <div className="space-y-6 animate-fade-up">
        <button onClick={() => setDetailSession(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.back}
        </button>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary-600 to-accent-500" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                <Image src={detailSession.doctorAvatar} alt={detailSession.doctorName} fill className="object-cover" unoptimized />
              </div>
              <div className="flex-1">
                <h2 className="font-display font-bold text-xl text-slate-800">{detailSession.doctorName}</h2>
                <p className="text-primary-600 font-medium">{detailSession.doctorSpecialty}</p>
                {detailSession.startedAt && (
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-primary-400" />
                      {formatDate(detailSession.startedAt)} at {formatTime(detailSession.startedAt)}
                    </span>
                    {detailSession.durationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-primary-400" />
                        {detailSession.durationMinutes} {t.minutes}
                      </span>
                    )}
                  </div>
                )}
                {detailSession.isFollowUp && detailSession.followUpScheduledAt && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-primary-600 font-medium">
                    <Bell className="w-4 h-4" />
                    {t.scheduled}: {formatDate(detailSession.followUpScheduledAt)} at {formatTime(detailSession.followUpScheduledAt)}
                  </div>
                )}
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${detailSession.status === "completed" ? "bg-emerald-50 text-emerald-700" : detailSession.status === "follow_up" ? "bg-primary-50 text-primary-700" : "bg-gold-50 text-gold-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detailSession.status === "completed" ? "bg-emerald-500" : detailSession.status === "follow_up" ? "bg-primary-500" : "bg-gold-400"}`} />
                    {detailSession.isFollowUp ? t.followUp : detailSession.status.charAt(0).toUpperCase() + detailSession.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-600" />
            </div>
            <h3 className="font-display font-semibold text-slate-800">{t.summary}</h3>
          </div>
          {detailSession.summary ? (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">{detailSession.summary}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">{t.noSummary}</p>
          )}
          {detailSession.notes && (
            <div className="mt-3 bg-primary-50/50 rounded-xl p-3 border border-primary-100">
              <p className="text-xs font-semibold text-primary-600 mb-1">Notes</p>
              <p className="text-sm text-slate-600 italic">&ldquo;{detailSession.notes}&rdquo;</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-accent-600" />
              </div>
              <h3 className="font-display font-semibold text-slate-800">{t.chatHistory}</h3>
            </div>
            <button onClick={() => { setDetailSession(null); handleChat(detailSession); }} className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1">
              {t.openChat} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {detailSession.chatHistory && detailSession.chatHistory.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {detailSession.chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  {msg.from !== "me" && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image src={detailSession.doctorAvatar} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${msg.from === "me" ? "bg-primary-600 text-white rounded-br-md" : "bg-slate-100 text-slate-700 rounded-bl-md"}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">{t.noChatHistory}</p>
          )}
        </div>

        {detailSession.status === "completed" && (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
              <h3 className="font-display font-semibold text-slate-800">{t.rateConsultation}</h3>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((n) => (
                <button key={n} className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-gold-50 hover:border-gold-300 transition-colors flex items-center justify-center text-lg">⭐</button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const current = grouped[tab];

  return (
    <div className="space-y-6">
      <OnboardingGuide page="appointments" />

      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">{t.title}</h1>
          <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
        </div>
        <a href="/doctors" className="btn-primary text-sm" data-action="book-appointment">
          <Video className="w-4 h-4" /> {t.findDoctor}
        </a>
      </div>

      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100 w-fit gap-1 animate-fade-up">
        {([["active", t.active, Calendar], ["history", t.history, History]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === key ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {grouped[key as Tab].length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map((i) => <div key={i} className="bg-white rounded-2xl p-5 animate-shimmer h-28" />)}</div>
      ) : current.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-primary-300" />
          </div>
          <p className="text-slate-500 font-medium">{tab === "active" ? t.noActive : t.noHistory}</p>
          {tab === "active" && (
            <a href="/doctors" className="btn-primary mt-4 inline-flex">{t.findDoctor}</a>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up">
          {current.map((session) => {
            const isFollowUp = session.isFollowUp && session.status === "follow_up";
            const canJoinNow = isFollowUp && session.followUpScheduledAt && new Date(session.followUpScheduledAt).getTime() - Date.now() < 5 * 60 * 1000;
            const timeLeft = isFollowUp && session.followUpScheduledAt ? timeUntil(session.followUpScheduledAt) : null;

            return (
              <div key={session.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row gap-4 transition-all hover:shadow-md ${isFollowUp ? "border-l-4 border-l-primary-500 border-slate-100" : "border-slate-100"}`}>
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image src={session.doctorAvatar} alt={session.doctorName} fill className="object-cover" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-800">{session.doctorName}</p>
                      <p className="text-sm text-primary-600 font-medium">{session.doctorSpecialty}</p>
                    </div>
                    {isFollowUp && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                        <Bell className="w-3 h-3" /> {t.followUp}
                      </span>
                    )}
                    {session.status === "completed" && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>

                  {isFollowUp && session.followUpScheduledAt && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-primary-400" />
                      {formatDate(session.followUpScheduledAt)} · {formatTime(session.followUpScheduledAt)}
                      {timeLeft && timeLeft !== "Now" && (
                        <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium">in {timeLeft}</span>
                      )}
                    </div>
                  )}

                  {session.startedAt && session.status === "completed" && (
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(session.startedAt)}</span>
                      {session.durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{session.durationMinutes} {t.minutes}</span>}
                    </div>
                  )}

                  {session.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic bg-slate-50 rounded-lg px-3 py-1.5">&quot;{session.notes}&quot;</p>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {(canJoinNow || timeLeft === "Now") && isFollowUp && (
                      <button onClick={() => handleJoin(session)} className="btn-primary text-xs py-2 px-4" data-action="join-meeting">
                        <Zap className="w-3.5 h-3.5" /> {t.joinNow}
                      </button>
                    )}
                    {isFollowUp && !canJoinNow && timeLeft && timeLeft !== "Now" && (
                      <div className="flex items-center gap-1.5 text-xs bg-primary-50 text-primary-600 px-3 py-2 rounded-xl font-medium">
                        <Clock className="w-3.5 h-3.5" /> {t.joinIn} {timeLeft}
                      </div>
                    )}
                    <button onClick={() => handleChat(session)} className="btn-secondary text-xs py-2 px-4">
                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                    </button>
                    {session.status === "completed" && (
                      <button onClick={() => setDetailSession(session)} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium ml-auto py-2 px-3 rounded-xl hover:bg-primary-50 transition-colors">
                        {t.viewDetails} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chat panel */}
      {chatOpen && chatSession && (
        <div className="fixed inset-y-0 right-0 z-40 flex">
          <div className="fixed inset-0 bg-black/10" onClick={() => setChatOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-white shadow-xl flex flex-col border-l border-slate-200 animate-slide-in-right">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image src={chatSession.doctorAvatar} alt="" fill className="object-cover" unoptimized />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">{chatSession.doctorName}</p>
                <p className="text-xs text-accent-500 font-medium">● Online</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  {msg.from !== "me" && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image src={chatSession.doctorAvatar} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl ${msg.from === "me" ? "bg-primary-600 text-white rounded-br-md" : "bg-white text-slate-700 border border-slate-100 rounded-bl-md shadow-sm"}`}>
                    {(msg as any).fileType === "image" && (msg as any).fileUrl ? (
                      <div className="p-2"><img src={(msg as any).fileUrl} alt="" className="rounded-lg max-w-full max-h-48 object-contain" /><p className={`text-[10px] mt-1 ${msg.from==="me"?"text-white/60":"text-slate-400"}`}>{msg.time}</p></div>
                    ) : (msg as any).fileType === "file" ? (
                      <div className="px-4 py-2.5"><div className={`flex items-center gap-2 p-2 rounded-lg ${msg.from==="me"?"bg-white/10":"bg-slate-100"}`}><Paperclip className="w-4 h-4"/><span className="text-xs truncate max-w-[130px]">{(msg as any).fileName}</span></div><p className={`text-[10px] mt-1 ${msg.from==="me"?"text-white/60":"text-slate-400"}`}>{msg.time}</p></div>
                    ) : (
                      <div className="px-4 py-2.5"><p className="text-sm">{msg.text}</p><p className={`text-[10px] mt-1 ${msg.from==="me"?"text-white/60":"text-slate-400"}`}>{msg.time}</p></div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-primary-400 transition-colors">
                <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500"><Paperclip className="w-4 h-4" /></button>
                <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400" />
                <button onClick={sendMessage} disabled={!newMsg.trim()} className="text-primary-600 disabled:text-slate-300"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
