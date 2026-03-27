"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PostCard from "@/components/ui/PostCard";
import {
  Star,
  Clock,
  Heart,
  Users,
  Video,
  MessageCircle,
  ArrowLeft,
  Globe,
  X,
  Send,
  Paperclip,
  Bell,
  BellRing,
  Zap,
  History,
  FileText,
  Building2,
  Shield,
  Award,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Play,
  Eye,
  ThumbsUp,
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";
import {
  isLoggedIn as checkAuth,
  getUser,
  loadUser,
} from "@/lib/supabase/auth";
import {
  getDoctorReviews,
  getConsultations,
  saveDoctor,
  unsaveDoctor,
  setRemindMe,
  clearRemindMe,
} from "@/lib/api";

type TabKey = "about" | "reviews" | "posts" | "history";

// ── Palette ──────────────────────────────────────────────────────────────────
const NAV_BG = "#1a3558";
const ACCENT = "#1e4470";

const STATUS_CFG: Record<
  string,
  {
    label: string;
    desc: string;
    dotClass: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  available: {
    label: "Available Now",
    desc: "Start a consultation immediately",
    dotClass: "bg-emerald-500 animate-pulse",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
  },
  busy: {
    label: "Busy",
    desc: "Currently in a session",
    dotClass: "bg-amber-400 animate-pulse",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
  in_consultation: {
    label: "In Consultation",
    desc: "With another patient",
    dotClass: "bg-amber-400 animate-pulse",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
    badgeBorder: "border-amber-200",
  },
  offline: {
    label: "Offline",
    desc: "Not available right now",
    dotClass: "bg-slate-400",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-500",
    badgeBorder: "border-slate-200",
  },
};

interface ChatMsg {
  id: string;
  from: "me" | "doctor";
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  time: string;
}
interface QueueInfo {
  position: number;
  estimatedWait: number;
  total: number;
}

// ── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 text-center px-2 py-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide leading-none mb-1">
        {label}
      </p>
      <p className="text-[15px] font-extrabold text-slate-800 leading-tight">
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── YouTube-style post card ───────────────────────────────────────────────────
function PostThumb({ post }: { post: Post }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {(post as any).thumbnail || (post as any).image ? (
          <Image
            src={(post as any).thumbnail || (post as any).image}
            alt={post.title || "Post"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #e0eaff 0%, #c8d8f5 100%)",
            }}
          >
            <FileText
              className="w-8 h-8"
              style={{ color: ACCENT, opacity: 0.5 }}
            />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 fill-slate-800 text-slate-800 ml-0.5" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="p-2.5">
        <p className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2 mb-1.5">
          {post.title || "Untitled Post"}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {(post as any).views && (
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {(post as any).views}
            </span>
          )}
          {(post as any).likes && (
            <span className="flex items-center gap-0.5">
              <ThumbsUp className="w-3 h-3" /> {(post as any).likes}
            </span>
          )}
          {(post as any).date && (
            <span>
              {new Date((post as any).date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoggedIn(checkAuth());
    const h = () => setIsLoggedIn(checkAuth());
    window.addEventListener("hc-auth-change", h);
    return () => window.removeEventListener("hc-auth-change", h);
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        let user = getUser();
        if (!user) user = await loadUser();
        const [docsRes, postsRes] = await Promise.all([
          fetch("/api/doctors").then((r) => r.json()),
          fetch("/api/posts").then((r) => r.json()),
        ]);
        const all = docsRes.data || docsRes;
        const doc = all.find((d: Doctor) => d.id === params.id);
        setDoctor(doc || null);
        setPosts(
          (postsRes.data || postsRes).filter(
            (p: Post) => p.doctorId === params.id,
          ),
        );
        setReviews(await getDoctorReviews(params.id as string));
        if (user) {
          const cons = await getConsultations(user.id);
          setConsultHistory(
            cons.filter(
              (c: any) => c.doctorId === params.id && c.status === "completed",
            ),
          );
          const [sr, rr] = await Promise.all([
            fetch(`/api/saved-doctors?patientId=${user.id}`)
              .then((r) => (r.ok ? r.json() : { data: [] }))
              .catch(() => ({ data: [] })),
            fetch(`/api/remind-me?patientId=${user.id}&doctorId=${params.id}`)
              .then((r) => (r.ok ? r.json() : { active: false }))
              .catch(() => ({ active: false })),
          ]);
          setSaved((sr.data ?? []).includes(params.id));
          setReminded(rr.active ?? false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [params.id]);

  useEffect(() => {
    if (
      !doctor ||
      (doctor.status !== "busy" && doctor.status !== "in_consultation")
    )
      return;
    fetch(`/api/queue?doctorId=${params.id}`)
      .then((r) => r.json())
      .then(setQueueInfo);
  }, [doctor, params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatOpen]);

  // Lock body scroll when chat is open
  useEffect(() => {
    document.body.style.overflow = chatOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [chatOpen]);

  const toggleSave = async () => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    const n = !saved;
    setSaved(n);
    try {
      n
        ? await saveDoctor(u.id, params.id as string)
        : await unsaveDoctor(u.id, params.id as string);
    } catch {
      setSaved(!n);
    }
  };

  const toggleRemind = async () => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    const n = !reminded;
    setReminded(n);
    try {
      n
        ? await setRemindMe(u.id, params.id as string)
        : await clearRemindMe(u.id, params.id as string);
    } catch {
      setReminded(!n);
    }
  };

  const joinQueue = () => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    router.push(
      `/meeting?doctor=${encodeURIComponent(doctor!.name)}&avatar=${encodeURIComponent(doctor!.avatar)}&duration=${doctor!.consultationDurationMinutes || 15}&doctorId=${doctor!.id}&patientId=${u.id}`,
    );
  };

  const openChat = async () => {
    if (!doctor) return;
    setChatOpen(true);
    const u = getUser();
    if (!u) return;
    try {
      const res = await fetch(
        `/api/messages?doctorId=${doctor.id}&patientId=${u.id}`,
      );
      if (res.ok) {
        const json = await res.json();
        const msgs = (json.data ?? []).map((m: any) => ({
          id: m.id,
          from:
            m.sender_role === "patient" ? ("me" as const) : ("doctor" as const),
          text: m.body ?? "",
          time: new Date(m.created_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          fileUrl: m.attachment_url,
          fileName: m.attachment_name,
          fileType: m.attachment_type === "image" ? "image" : "file",
        }));
        setChatMessages(
          msgs.length === 0
            ? [
                {
                  id: "c1",
                  from: "doctor",
                  text: `Hi! I'm ${doctor.name}. How can I help you today?`,
                  time: "Now",
                },
              ]
            : msgs,
        );
      }
    } catch {
      setChatMessages([
        {
          id: "c1",
          from: "doctor",
          text: `Hi! I'm ${doctor.name}. How can I help you today?`,
          time: "Now",
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !doctor) return;
    const u = getUser();
    if (!u) return;
    const txt = newMsg.trim();
    setNewMsg("");
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    setChatMessages((p) => [
      ...p,
      { id: `cm-${Date.now()}`, from: "me", text: txt, time: now },
    ]);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          patientId: u.id,
          senderId: u.id,
          senderRole: "patient",
          body: txt,
        }),
      });
    } catch {}
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doctor) return;
    const u = getUser();
    if (!u) return;
    const isImg = file.type.startsWith("image/");
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    setChatMessages((p) => [
      ...p,
      {
        id: `cf-${Date.now()}`,
        from: "me",
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: isImg ? "image" : "file",
        time: now,
      },
    ]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error();
      const ud = await up.json();
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          patientId: u.id,
          senderId: u.id,
          senderRole: "patient",
          attachmentUrl: ud.url,
          attachmentName: ud.name,
          attachmentType: isImg ? "image" : "document",
          attachmentSize: ud.size,
        }),
      });
    } catch {
    } finally {
      e.target.value = "";
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#eef2f7" }}>
        <div style={{ background: NAV_BG, height: 56 }} />
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
          {[220, 80, 300].map((h, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#eef2f7" }}
      >
        <p className="text-slate-500 mb-4 text-sm">Doctor not found</p>
        <Link
          href="/doctors"
          className="text-sm font-bold text-white px-5 py-2.5 rounded-xl"
          style={{ background: NAV_BG }}
        >
          Back to Doctors
        </Link>
      </div>
    );
  }

  const sc = STATUS_CFG[doctor.status] ?? STATUS_CFG["offline"];
  const isOnline = doctor.status !== "offline";
  const isOffline = doctor.status === "offline";

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "about", label: "About" },
    { key: "reviews", label: "Reviews", count: reviews.length },
    { key: "history", label: "History", count: consultHistory.length },
    { key: "posts", label: "Posts", count: posts.length },
  ];

  return (
    <>
      <div className="min-h-screen pb-10" style={{ background: "#eef2f7" }}>
        {/* ── NAV ─────────────────────────────────────────────────────────── */}
        <header style={{ background: NAV_BG }}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Doctors
            </button>
            <span className="font-extrabold text-white text-base">
              MediBook
            </span>
            <button
              onClick={toggleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${saved ? "bg-rose-500 text-white border-rose-500" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? "fill-white" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4">
          {/* ── PROFILE CARD (Image 1 + Image 2 combined style) ──────────── */}
          <div
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
          >
            {/* Top accent bar */}
            <div
              className="h-1.5"
              style={{
                background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT})`,
              }}
            />

            <div className="p-4 sm:p-5">
              {/* ── Main profile row: photo | info | fee+CTA ── */}
              <div className="flex gap-4 items-start">
                {/* Photo */}
                <div
                  className="relative flex-shrink-0 w-[100px] sm:w-[120px] rounded-xl overflow-hidden self-stretch"
                  style={{
                    background:
                      "linear-gradient(160deg, #cfe0ff 0%, #9ec5f8 100%)",
                    minHeight: 130,
                  }}
                >
                  <Image
                    src={doctor.avatar}
                    alt={doctor.name}
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                  {isOnline && (
                    <span className="absolute bottom-2 right-2 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Middle: name, specialty, hospital, tags */}
                <div className="flex-1 min-w-0">
                  {/* PROFILE label like image 2 */}
                  <p
                    className="text-[10px] font-extrabold uppercase tracking-widest mb-1"
                    style={{ color: ACCENT }}
                  >
                    Profile
                  </p>
                  <h1 className="font-extrabold text-slate-900 text-[17px] sm:text-[20px] leading-tight">
                    {doctor.name}
                  </h1>
                  <p className="text-[12px] font-semibold text-slate-500 mt-0.5">
                    {doctor.specialty}
                  </p>

                  {/* Degrees / qual */}
                  <p className="text-[11px] text-slate-400 mt-1">
                    MBBS
                    {doctor.tags?.length
                      ? ` · ${doctor.tags.slice(0, 2).join(", ")}`
                      : ""}
                  </p>

                  {/* Hospital */}
                  <div className="flex items-start gap-1.5 mt-2">
                    <Building2
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: ACCENT }}
                    />
                    <p className="text-[12px] text-slate-600 font-medium leading-snug">
                      {doctor.hospital}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div
                    className={`inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.badgeBg} ${sc.badgeText} ${sc.badgeBorder}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${sc.dotClass}`}
                    />
                    {sc.label}
                  </div>

                  {/* Speciality pills */}
                  {doctor.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {doctor.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{
                            background: "#eff6ff",
                            color: NAV_BG,
                            borderColor: "#bfdbfe",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Fee + CTA buttons — bold and prominent */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2 hidden sm:flex">
                  {/* Fee box */}
                  <div className="text-right border border-slate-100 rounded-xl px-4 py-3 bg-slate-50">
                    <p className="text-[10px] text-slate-400 leading-none">
                      Consultation Fee
                    </p>
                    <p
                      className="text-[22px] font-extrabold leading-tight mt-0.5"
                      style={{ color: ACCENT }}
                    >
                      {doctor.fee}
                      <span className="text-[12px] font-bold text-slate-500 ml-1">
                        Birr
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Incl. VAT · Per visit
                    </p>
                  </div>

                  {/* CTA */}
                  {doctor.status === "available" &&
                    (isLoggedIn ? (
                      <Link
                        href={`/meeting?doctor=${encodeURIComponent(doctor.name)}&avatar=${encodeURIComponent(doctor.avatar)}&duration=${doctor.consultationDurationMinutes || 15}&doctorId=${doctor.id}&patientId=${getUser()?.id}`}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white w-full justify-center transition-all active:scale-95"
                        style={{ background: NAV_BG }}
                      >
                        <Zap className="w-4 h-4" /> Consult Now
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white w-full justify-center"
                        style={{ background: NAV_BG }}
                      >
                        <Zap className="w-4 h-4" /> Sign In to Consult
                      </Link>
                    ))}
                  {(doctor.status === "busy" ||
                    doctor.status === "in_consultation") && (
                    <button
                      onClick={joinQueue}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 transition-all w-full justify-center"
                    >
                      <Users className="w-4 h-4" /> Join Queue
                    </button>
                  )}
                  {isOffline && (
                    <button
                      onClick={toggleRemind}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all active:scale-95 w-full justify-center ${reminded ? "text-white border-transparent" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"}`}
                      style={
                        reminded
                          ? { background: NAV_BG, borderColor: NAV_BG }
                          : {}
                      }
                    >
                      {reminded ? (
                        <BellRing className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {reminded ? "Reminder Set" : "Remind Me"}
                    </button>
                  )}
                  <button
                    onClick={
                      isLoggedIn ? openChat : () => router.push("/login")
                    }
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 active:scale-95 transition-all w-full justify-center"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                </div>
              </div>

              {/* Mobile: Fee + CTA below (shown only on mobile) */}
              <div className="sm:hidden mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400">
                      Consultation Fee
                    </p>
                    <p
                      className="text-[20px] font-extrabold"
                      style={{ color: ACCENT }}
                    >
                      {doctor.fee}{" "}
                      <span className="text-[11px] font-semibold text-slate-500">
                        Birr
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-400">
                      Incl. VAT · Per visit
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.badgeBg} ${sc.badgeText} ${sc.badgeBorder}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${sc.dotClass}`}
                    />{" "}
                    {sc.label}
                  </div>
                </div>
                <div className="flex gap-2">
                  {doctor.status === "available" &&
                    (isLoggedIn ? (
                      <Link
                        href={`/meeting?doctor=${encodeURIComponent(doctor.name)}&avatar=${encodeURIComponent(doctor.avatar)}&duration=${doctor.consultationDurationMinutes || 15}&doctorId=${doctor.id}&patientId=${getUser()?.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold text-white"
                        style={{ background: NAV_BG }}
                      >
                        <Zap className="w-4 h-4" /> Consult Now
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold text-white"
                        style={{ background: NAV_BG }}
                      >
                        <Zap className="w-4 h-4" /> Sign In
                      </Link>
                    ))}
                  {(doctor.status === "busy" ||
                    doctor.status === "in_consultation") && (
                    <button
                      onClick={joinQueue}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold text-white bg-amber-500"
                    >
                      <Users className="w-4 h-4" /> Join Queue
                    </button>
                  )}
                  {isOffline && (
                    <button
                      onClick={toggleRemind}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all ${reminded ? "text-white border-transparent" : "bg-slate-100 text-slate-700 border-slate-200"}`}
                      style={reminded ? { background: NAV_BG } : {}}
                    >
                      {reminded ? (
                        <BellRing className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {reminded ? "Reminder Set" : "Remind Me"}
                    </button>
                  )}
                  <button
                    onClick={
                      isLoggedIn ? openChat : () => router.push("/login")
                    }
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-700 bg-white"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat
                  </button>
                </div>
              </div>

              {/* ── Stats row (like image 1 bottom: experience, BMDC, joined, rating) */}
              <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
                <div className="flex items-stretch divide-x divide-dashed divide-slate-200">
                  <StatBox
                    label="Total Experience"
                    value={`${doctor.experience}+ Yrs`}
                  />
                  <StatBox
                    label="Total Rating"
                    value={`★ ${doctor.rating.toFixed(1)}`}
                    sub={`(${doctor.reviews} reviews)`}
                  />
                  <StatBox
                    label="Patients Served"
                    value={
                      doctor.patientsServed
                        ? `${doctor.patientsServed.toLocaleString()}`
                        : "—"
                    }
                  />
                  <StatBox
                    label="Session Duration"
                    value={`${doctor.consultationDurationMinutes || 15} min`}
                    sub="max per visit"
                  />
                </div>
              </div>

              {/* Next available alert */}
              {isOffline && doctor.nextAvailableSlot && (
                <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                  <Calendar
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <p className="text-[11px] text-slate-700">
                    Next available:{" "}
                    <span className="font-bold" style={{ color: ACCENT }}>
                      {doctor.nextAvailableSlot}
                    </span>
                  </p>
                </div>
              )}

              {/* Queue info */}
              {queueInfo && !isOffline && (
                <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <Users className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <p className="text-[11px] text-amber-800 font-medium">
                    {queueInfo.total} waiting · ~{queueInfo.estimatedWait} min ·
                    Your position: <strong>#{queueInfo.position}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────────────────── */}
          <div
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div
              className="flex"
              style={{ overflowX: "auto", scrollbarWidth: "none" }}
            >
              {TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-bold transition-all whitespace-nowrap px-3 border-b-[3px] min-w-[72px]"
                  style={
                    activeTab === key
                      ? {
                          color: NAV_BG,
                          borderBottomColor: NAV_BG,
                          background: "#eff6ff",
                        }
                      : { color: "#94a3b8", borderBottomColor: "transparent" }
                  }
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span
                      className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                      style={
                        activeTab === key
                          ? { background: NAV_BG, color: "white" }
                          : { background: "#e2e8f0", color: "#64748b" }
                      }
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── ABOUT ──────────────────────────────────────────────────────── */}
          {activeTab === "about" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="space-y-4">
                {/* Biography */}
                <div
                  className="bg-white border border-slate-200 rounded-xl p-4"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <h3
                    className="text-[10px] font-extrabold uppercase tracking-widest mb-2"
                    style={{ color: ACCENT }}
                  >
                    Biography
                  </h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {doctor.bio || "No biography provided."}
                  </p>
                </div>

                {/* Speciality */}
                {doctor.tags?.length > 0 && (
                  <div
                    className="bg-white border border-slate-200 rounded-xl p-4"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <h3
                      className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                      style={{ color: ACCENT }}
                    >
                      Speciality
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {doctor.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-semibold px-3 py-1.5 rounded-full border"
                          style={{
                            background: "#eff6ff",
                            color: NAV_BG,
                            borderColor: "#bfdbfe",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Experience / Languages / Type */}
                <div
                  className="bg-white border border-slate-200 rounded-xl p-4"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  {[
                    {
                      label: "Experience",
                      value: `${doctor.experience} Years+`,
                    },
                    {
                      label: "Languages",
                      value: doctor.languages?.join(", ") || "—",
                    },
                    {
                      label: "Type",
                      value: (doctor as any).type || "Full Time Physician",
                    },
                    {
                      label: "Consultation",
                      value:
                        doctor.consultationType === "video"
                          ? "Video Call"
                          : doctor.consultationType === "both"
                            ? "In-person & Video"
                            : "In-person",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between py-2 border-b border-dashed border-slate-100 last:border-0"
                    >
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 w-28 flex-shrink-0">
                        {row.label}
                      </p>
                      <p className="text-[12px] font-semibold text-slate-700 text-right">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Contact */}
                <div
                  className="bg-white border border-slate-200 rounded-xl p-4"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <h3
                    className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                    style={{ color: ACCENT }}
                  >
                    Contact
                  </h3>
                  <div className="space-y-2">
                    {(doctor as any).phone && (
                      <div className="flex items-center gap-2">
                        <Phone
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: ACCENT }}
                        />
                        <p className="text-[12px] text-slate-600">
                          {(doctor as any).phone}
                        </p>
                      </div>
                    )}
                    {(doctor as any).email && (
                      <div className="flex items-center gap-2">
                        <Mail
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: ACCENT }}
                        />
                        <p className="text-[12px] text-slate-600">
                          {(doctor as any).email}
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Building2
                        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                        style={{ color: ACCENT }}
                      />
                      <p className="text-[12px] text-slate-600 leading-snug">
                        {doctor.hospital}
                      </p>
                    </div>
                    {(doctor as any).address && (
                      <div className="flex items-start gap-2">
                        <MapPin
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          style={{ color: ACCENT }}
                        />
                        <p className="text-[12px] text-slate-600 leading-snug">
                          {(doctor as any).address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEWS ────────────────────────────────────────────────────── */}
          {activeTab === "reviews" && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <div
                  className="bg-white border border-slate-200 rounded-xl p-10 text-center"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-medium">
                    No reviews yet
                  </p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3"
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-slate-100">
                      <Image
                        src={r.avatar}
                        alt={r.author}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-[13px] text-slate-800">
                          {r.author}
                        </p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        {r.text}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {new Date(r.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── HISTORY ────────────────────────────────────────────────────── */}
          {activeTab === "history" && (
            <div
              className="bg-white border border-slate-200 rounded-xl p-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                style={{ color: ACCENT }}
              >
                Previous Consultations
              </h3>
              {consultHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    No previous consultations with this doctor
                  </p>
                </div>
              ) : (
                consultHistory.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 mb-2"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#eff6ff" }}
                    >
                      <History className="w-4 h-4" style={{ color: ACCENT }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[12px] font-bold text-slate-800">
                          {new Date(
                            rec.startedAt ?? rec.created_at,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        {rec.durationMinutes && (
                          <span
                            className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#eff6ff", color: NAV_BG }}
                          >
                            <Clock className="w-2.5 h-2.5" />{" "}
                            {rec.durationMinutes} min
                          </span>
                        )}
                      </div>
                      {rec.notes && (
                        <p className="text-[11px] text-slate-500">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                    <button
                      className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0"
                      style={{ color: ACCENT }}
                    >
                      <FileText className="w-3.5 h-3.5" /> View
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── POSTS — YouTube grid ────────────────────────────────────────── */}
          {activeTab === "posts" && (
            <div>
              {posts.length === 0 ? (
                <div
                  className="bg-white border border-slate-200 rounded-xl p-10 text-center"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    No posts from this doctor yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {posts.map((post) => (
                    <Link key={post.id} href={`/posts/${post.id}`}>
                      <PostThumb post={post} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT SIDEBAR (slides from right, does NOT overlay content) ──────── */}
      {/* Backdrop — only dims, doesn't push content */}
      <div
        className="fixed inset-0 z-40 pointer-events-none transition-all duration-300"
        style={{
          background: chatOpen ? "rgba(0,0,0,0.35)" : "transparent",
          pointerEvents: chatOpen ? "auto" : "none",
        }}
        onClick={() => setChatOpen(false)}
      />

      {/* Sidebar panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          width: "min(100vw, 380px)",
          transform: chatOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Chat header */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 flex-shrink-0"
          style={{ background: NAV_BG }}
        >
          {/* Easy exit button — big, obvious */}
          <button
            onClick={() => setChatOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 transition-all hover:bg-white/20 active:scale-95"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-blue-400 border-2 border-white/30">
            <Image
              src={doctor.avatar}
              alt={doctor.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[14px] text-white leading-tight truncate">
              {doctor.name}
            </p>
            <p
              className="text-[11px] font-medium mt-0.5"
              style={{ color: isOnline ? "#6ee7b7" : "#94a3b8" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px"
                style={{ background: isOnline ? "#34d399" : "#94a3b8" }}
              />
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ background: "#f8fafc" }}
        >
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.from === "me" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {msg.from !== "me" && (
                <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border-2 border-white shadow">
                  <Image
                    src={doctor.avatar}
                    alt=""
                    fill
                    className="object-cover"
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
                    : { background: "#ffffff", border: "1px solid #e2e8f0" }
                }
              >
                {msg.fileType === "image" && msg.fileUrl ? (
                  <div className="p-1.5">
                    <img
                      src={msg.fileUrl}
                      alt=""
                      className="rounded-xl max-w-full max-h-48 object-contain block"
                    />
                    <p
                      className="text-[10px] px-1 pt-1"
                      style={{
                        color:
                          msg.from === "me"
                            ? "rgba(255,255,255,0.55)"
                            : "#94a3b8",
                      }}
                    >
                      {msg.time}
                    </p>
                  </div>
                ) : msg.fileType === "file" ? (
                  <div className="px-3 py-2.5">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${msg.from === "me" ? "bg-white/15" : "bg-slate-100"}`}
                    >
                      <Paperclip
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: msg.from === "me" ? "white" : ACCENT }}
                      />
                      <span
                        className="text-[12px] font-medium truncate max-w-[140px]"
                        style={{
                          color: msg.from === "me" ? "white" : "#334155",
                        }}
                      >
                        {msg.fileName}
                      </span>
                    </div>
                    <p
                      className="text-[10px] mt-1.5 text-right"
                      style={{
                        color:
                          msg.from === "me"
                            ? "rgba(255,255,255,0.55)"
                            : "#94a3b8",
                      }}
                    >
                      {msg.time}
                    </p>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5">
                    {/* Message text — always fully readable */}
                    <p
                      className="text-[13px] font-medium leading-relaxed break-words"
                      style={{
                        color: msg.from === "me" ? "#ffffff" : "#1e293b",
                      }}
                    >
                      {msg.text}
                    </p>
                    <p
                      className="text-[10px] mt-1 text-right"
                      style={{
                        color:
                          msg.from === "me"
                            ? "rgba(255,255,255,0.6)"
                            : "#94a3b8",
                      }}
                    >
                      {msg.time}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFile}
            accept="image/*,.pdf,.doc,.docx"
          />
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 border border-slate-200 bg-slate-50 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 transition-colors"
              style={{ color: "#94a3b8" }}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 text-[13px] bg-transparent outline-none font-medium"
              style={{ color: "#1e293b" }}
              autoFocus
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
              style={{ background: newMsg.trim() ? NAV_BG : "#e2e8f0" }}
            >
              <Send
                className="w-3.5 h-3.5"
                style={{ color: newMsg.trim() ? "white" : "#94a3b8" }}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
