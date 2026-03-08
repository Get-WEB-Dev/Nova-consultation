"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PostCard from "@/components/ui/PostCard";
import {
  Star, Clock, Heart, Users, Video,
  MessageCircle, ArrowLeft, Globe, DollarSign,
  BookmarkCheck, Bookmark, X, Send, Paperclip,
  Bell, BellRing, Zap, AlertCircle, History,
  FileText, CheckCircle,
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";
import { isLoggedIn as checkAuth, getUser, loadUser } from "@/lib/supabase/auth";
import { getDoctorReviews, getConsultations, saveDoctor, unsaveDoctor, setRemindMe, clearRemindMe } from "@/lib/api";

type TabKey = "about" | "reviews" | "posts" | "history";
type Lang = "en" | "am";

const STATUS_LABELS: Record<string, { label: string; desc: string; color: string; dot: string; btnColor: string }> = {
  available: { label: "Available Now", desc: "Start a consultation immediately", color: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500 animate-pulse", btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" },
  busy: { label: "Busy", desc: "Currently in a session — join queue", color: "bg-gold-50 text-gold-700 border border-gold-200", dot: "bg-gold-400 animate-pulse", btnColor: "bg-gold-500 hover:bg-gold-600 text-white border-gold-500" },
  in_consultation: { label: "In Consultation", desc: "With another patient — join queue", color: "bg-orange-50 text-orange-700 border border-orange-200", dot: "bg-orange-400 animate-pulse", btnColor: "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" },
  offline: { label: "Offline", desc: "Not available right now", color: "bg-slate-100 text-slate-500 border border-slate-200", dot: "bg-slate-400", btnColor: "bg-slate-200 text-slate-600 border-slate-200 cursor-not-allowed" },
};

// ── MOCK REVIEWS (disabled) ───────────────────────────────────
// const MOCK_REVIEWS = [
//   { id: "r1", author: "Meron A.", rating: 5, text: "Excellent doctor! Very thorough and caring.", date: "2024-05-20", avatar: "..." },
//   { id: "r2", author: "Yonas T.", rating: 5, text: "Very professional.", date: "2024-04-15", avatar: "..." },
// ];
//
// ── MOCK CONSULTATION HISTORY (disabled) ─────────────────────
// const MOCK_HISTORY = [
//   { id: "h1", date: "2024-05-10", time: "10:00 AM", duration: 14, notes: "General checkup." },
//   { id: "h2", date: "2024-02-20", time: "2:00 PM",  duration: 18, notes: "Discussed test results." },
// ];
// ─────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string; from: "me" | "doctor";
  text?: string; fileUrl?: string; fileName?: string; fileType?: string; time: string;
}

interface QueueInfo { position: number; estimatedWait: number; total: number; }

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [consultHistory, setConsultHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [saved, setSaved] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoggedIn(checkAuth());
    const handler = () => setIsLoggedIn(checkAuth());
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  useEffect(() => {
    const storedLang = localStorage.getItem("hc-lang") as Lang | null;
    if (storedLang) setLang(storedLang);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        // Ensure user cache is loaded
        let user = getUser();
        if (!user) user = await loadUser();

        const [docsRes, postsRes] = await Promise.all([
          fetch("/api/doctors").then((r) => r.json()),
          fetch("/api/posts").then((r) => r.json()),
        ]);

        const all = docsRes.data || docsRes;
        const doc = all.find((d: Doctor) => d.id === params.id);
        setDoctor(doc || null);
        setPosts((postsRes.data || postsRes).filter((p: Post) => p.doctorId === params.id));

        // Load reviews from Supabase
        const reviewData = await getDoctorReviews(params.id as string);
        setReviews(reviewData);

        // Load consultation history for this doctor if logged in
        if (user) {
          const consultations = await getConsultations(user.id);
          const doctorHistory = consultations.filter(
            (c: any) => c.doctorId === params.id && c.status === "completed"
          );
          setConsultHistory(doctorHistory);
        }

        // Load saved/remind state from Supabase
        if (user) {
          const [savedRes, remindRes] = await Promise.all([
            fetch(`/api/saved-doctors?patientId=${user.id}`).then((r) => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
            fetch(`/api/remind-me?patientId=${user.id}&doctorId=${params.id}`).then((r) => r.ok ? r.json() : { active: false }).catch(() => ({ active: false })),
          ]);
          setSaved((savedRes.data ?? []).includes(params.id));
          setReminded(remindRes.active ?? false);
        }
      } catch (err) {
        console.error("Failed to load doctor page data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [params.id]);

  // Fetch queue info when busy/in_consultation
  useEffect(() => {
    if (!doctor || (doctor.status !== "busy" && doctor.status !== "in_consultation")) return;
    fetch(`/api/queue?doctorId=${params.id}`)
      .then((r) => r.json())
      .then(setQueueInfo);
  }, [doctor, params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  const toggleSave = async () => {
    const user = getUser();
    if (!user) { router.push("/login"); return; }
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) {
        await saveDoctor(user.id, params.id as string);
      } else {
        await unsaveDoctor(user.id, params.id as string);
      }
    } catch {
      // Revert optimistic update on failure
      setSaved(!newSaved);
    }
  };

  const toggleRemind = async () => {
    const user = getUser();
    if (!user) { router.push("/login"); return; }
    const newReminded = !reminded;
    setReminded(newReminded);
    try {
      if (newReminded) {
        await setRemindMe(user.id, params.id as string);
      } else {
        await clearRemindMe(user.id, params.id as string);
      }
    } catch {
      setReminded(!newReminded);
    }
  };

  const joinQueue = () => {
    if (!isLoggedIn) { router.push("/login"); return; }
    setInQueue(true);
    // Simulate getting a position
    setQueueInfo((prev) => prev ? { ...prev, position: (prev.total || 0) + 1 } : { position: 1, estimatedWait: 8, total: 1 });
  };

  const leaveQueue = () => setInQueue(false);

  const openChat = async () => {
    if (!doctor) return;
    setChatOpen(true);
    if (chatMessages.length === 0) {
      setChatMessages([{ id: "c1", from: "doctor", text: `Hi! I'm ${doctor.name}. How can I help you today?`, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]);
    }
    // If there is an active consultation, load its messages
    const user = getUser();
    if (user && consultHistory.length > 0) {
      const latest = consultHistory[0];
      try {
        const res = await fetch(`/api/messages?consultationId=${latest.id}`);
        if (res.ok) {
          const json = await res.json();
          const msgs = (json.data ?? []).map((m: any) => ({
            id:   m.id,
            from: m.sender_role === "patient" ? "me" as const : "doctor" as const,
            text: m.body ?? "",
            time: new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          }));
          if (msgs.length > 0) setChatMessages(msgs);
        }
      } catch { /* keep default greeting */ }
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !doctor) return;
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const txt = newMsg.trim();
    setChatMessages((prev) => [...prev, { id: `cm-${Date.now()}`, from: "me", text: txt, time: now }]);
    setNewMsg("");

    const user = getUser();
    if (user && consultHistory.length > 0) {
      try {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: consultHistory[0].id,
            senderId: user.id,
            senderRole: "patient",
            body: txt,
          }),
        });
      } catch { /* optimistic */ }
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { id: `cf-${Date.now()}`, from: "me", fileUrl: url, fileName: file.name, fileType: file.type.startsWith("image/") ? "image" : "file", time: now }]);
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="bg-white rounded-2xl p-6 animate-shimmer h-48" />
        <div className="bg-white rounded-2xl p-6 animate-shimmer h-64" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Doctor not found</p>
        <Link href="/doctors" className="btn-primary mt-4">Back to Doctors</Link>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[doctor.status] || STATUS_LABELS["offline"];
  const isOnline = doctor.status === "available" || doctor.status === "busy" || doctor.status === "in_consultation";

  const TABS: { key: TabKey; label: string }[] = [
    { key: "about", label: "About" },
    { key: "reviews", label: "Reviews" },
    { key: "history", label: "History" },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary-600 via-accent-500 to-gold-400" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
              <Image src={doctor.avatar} alt={doctor.name} fill className="object-cover" unoptimized />
              {isOnline && <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display font-bold text-xl text-slate-800">{doctor.name}</h1>
                  <p className="text-primary-600 font-medium mt-0.5">{doctor.specialty}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{doctor.hospital}</p>
                </div>
                <button onClick={toggleSave} className={`p-2.5 rounded-xl border transition-all ${saved ? "bg-rose-50 border-rose-200 text-rose-500" : "bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200"}`}>
                  {saved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                <span className="flex items-center gap-1 text-gold-500">
                  <Star className="w-4 h-4 fill-gold-400" />
                  <span className="font-semibold text-slate-800">{doctor.rating}</span>
                  <span className="text-slate-400">({doctor.reviews})</span>
                </span>
                <span className="flex items-center gap-1 text-slate-500"><Clock className="w-4 h-4 text-primary-500" /> {doctor.experience} yrs</span>
                <span className="flex items-center gap-1 text-slate-500"><Users className="w-4 h-4 text-accent-500" /> {doctor.patientsServed?.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-slate-500"><Globe className="w-4 h-4" /> {doctor.languages.join(", ")}</span>
                <span className="flex items-center gap-1 text-slate-500"><DollarSign className="w-4 h-4" /><span className="font-semibold text-primary-600">${doctor.fee}</span> / {doctor.consultationDurationMinutes || 15} min</span>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-2 mt-4 px-3 py-2 rounded-xl text-sm font-semibold w-fit ${statusCfg.color}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
                <span className="font-normal text-xs opacity-70">— {statusCfg.desc}</span>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-2 mt-5">
                {doctor.status === "available" && (
                  isLoggedIn ? (
                    <Link href={`/meeting?doctor=${encodeURIComponent(doctor.name)}&avatar=${encodeURIComponent(doctor.avatar)}&duration=${doctor.consultationDurationMinutes || 15}`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20">
                      <Zap className="w-4 h-4" /> Start Consultation Now
                    </Link>
                  ) : (
                    <Link href="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all">
                      <Zap className="w-4 h-4" /> Sign in to Consult
                    </Link>
                  )
                )}

                {(doctor.status === "busy" || doctor.status === "in_consultation") && !inQueue && (
                  <button onClick={joinQueue} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-semibold text-sm transition-all shadow-md shadow-gold-400/20">
                    <Users className="w-4 h-4" /> Join Waiting Queue
                  </button>
                )}

                {(doctor.status === "busy" || doctor.status === "in_consultation") && inQueue && queueInfo && (
                  <div className="flex items-center gap-3 bg-gold-50 border border-gold-200 rounded-xl px-4 py-2.5">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gold-600">#{queueInfo.position}</p>
                      <p className="text-[10px] text-gold-600 font-medium">Queue</p>
                    </div>
                    <div className="w-px h-10 bg-gold-200" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Est. {queueInfo.estimatedWait} min wait</p>
                      <p className="text-xs text-slate-500">You'll be notified when it's your turn</p>
                    </div>
                    <button onClick={leaveQueue} className="text-rose-400 hover:text-rose-600 transition-colors ml-2" title="Leave queue">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {doctor.status === "offline" && (
                  <button onClick={toggleRemind} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all ${reminded ? "bg-primary-50 text-primary-700 border-primary-200" : "bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600"}`}>
                    {reminded ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    {reminded ? "Reminder Set" : "Remind Me When Available"}
                  </button>
                )}

                {isLoggedIn ? (
                  <button onClick={openChat} className="btn-secondary">
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                ) : (
                  <Link href="/login" className="btn-secondary">
                    <MessageCircle className="w-4 h-4" /> Sign in to Message
                  </Link>
                )}
              </div>

              {/* Next available when offline */}
              {doctor.status === "offline" && doctor.nextAvailableSlot && (
                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-slate-600">
                  <AlertCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  Next available: <span className="font-semibold text-primary-600">{doctor.nextAvailableSlot}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-white rounded-xl p-1 shadow-sm border border-slate-100 gap-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === key ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up">
        {activeTab === "about" && (
          <div className="space-y-5">
            <div className="card">
              <h3 className="font-display font-semibold text-slate-800 mb-3">About</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
            </div>
            <div className="card">
              <h3 className="font-display font-semibold text-slate-800 mb-3">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.tags.map((tag) => <span key={tag} className="badge bg-primary-50 text-primary-700 border border-primary-100">{tag}</span>)}
              </div>
            </div>
            <div className="card">
              <h3 className="font-display font-semibold text-slate-800 mb-3">Consultation Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary-50 rounded-xl p-4 text-center border border-primary-100">
                  <p className="text-2xl font-bold text-primary-600">${doctor.fee}</p>
                  <p className="text-xs text-slate-500 mt-1">per session</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-slate-700">{doctor.consultationDurationMinutes || 15}</p>
                  <p className="text-xs text-slate-500 mt-1">min max session</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No reviews yet for this doctor</p>
              </div>
            ) : reviews.map((review) => (
              <div key={review.id} className="card flex items-start gap-3">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={review.avatar} alt={review.author} fill className="object-cover" unoptimized />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-800">{review.author}</p>
                    <div className="flex gap-0.5">{Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="w-3 h-3 text-gold-400 fill-gold-400" />)}</div>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{review.text}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">{new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="card">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Previous Consultations</h3>
            <div className="space-y-3">
              {consultHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No previous consultations with this doctor</p>
                </div>
              ) : consultHistory.map((record: any) => (
                <div key={record.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <History className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {record.startedAt
                          ? new Date(record.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : new Date(record.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        }
                      </p>
                      {record.durationMinutes && (
                        <span className="badge bg-primary-50 text-primary-600 border border-primary-100 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {record.durationMinutes} min
                        </span>
                      )}
                    </div>
                    {record.notes && (
                      <p className="text-xs text-slate-500 leading-relaxed">{record.notes}</p>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0">
                    <FileText className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "posts" && (
          <div className="space-y-4">
            {posts.length > 0 ? posts.map((post) => <PostCard key={post.id} {...post} />) : (
              <div className="text-center py-8"><p className="text-slate-400 text-sm">No posts from this doctor yet</p></div>
            )}
          </div>
        )}
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-40 flex">
          <div className="fixed inset-0 bg-black/10" onClick={() => setChatOpen(false)} />
          <div className="relative ml-auto w-full max-w-sm sm:max-w-md bg-white shadow-xl flex flex-col border-l border-slate-200 animate-slide-in-right">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image src={doctor.avatar} alt={doctor.name} fill className="object-cover" unoptimized />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-800">{doctor.name}</p>
                <p className="text-xs text-accent-500 font-medium">● Online</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  {msg.from !== "me" && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image src={doctor.avatar} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl ${msg.from === "me" ? "bg-primary-600 text-white rounded-br-md" : "bg-white text-slate-700 border border-slate-100 rounded-bl-md shadow-sm"}`}>
                    {msg.fileType === "image" && msg.fileUrl ? (
                      <div className="p-2"><img src={msg.fileUrl} alt="" className="rounded-lg max-w-full max-h-48 object-contain" /><p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p></div>
                    ) : msg.fileType === "file" ? (
                      <div className="px-4 py-2.5"><div className={`flex items-center gap-2 p-2 rounded-lg ${msg.from === "me" ? "bg-white/10" : "bg-slate-100"}`}><Paperclip className="w-4 h-4" /><span className="text-xs truncate max-w-[130px]">{msg.fileName}</span></div><p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p></div>
                    ) : (
                      <div className="px-4 py-2.5"><p className="text-sm">{msg.text}</p><p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p></div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} accept="image/*,.pdf,.doc,.docx" />
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-primary-400 transition-colors">
                <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500"><Paperclip className="w-4 h-4" /></button>
                <input type="text" value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Type a message..." className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400" autoFocus />
                <button onClick={sendMessage} disabled={!newMsg.trim()} className="text-primary-600 disabled:text-slate-300"><Send className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
