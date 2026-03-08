"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Video, MapPin, MessageCircle, Zap, ChevronRight, Hourglass } from "lucide-react";

interface AppointmentCardProps {
  id?: string;
  doctorId?: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  notes: string;
  sessionType?: string;
  unreadChat?: number;
  onJoin?: () => void;
  onChat?: () => void;
  onViewDetail?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  confirmed: { label: "Confirmed", color: "bg-accent-50 text-accent-700", dot: "bg-accent-500" },
  pending: { label: "Pending", color: "bg-gold-50 text-gold-700", dot: "bg-gold-400" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-600", dot: "bg-rose-400" },
  upcoming: { label: "Upcoming", color: "bg-primary-50 text-primary-700", dot: "bg-primary-500" },
};

export default function AppointmentCard(props: AppointmentCardProps) {
  const { id, doctorId, doctorName, doctorSpecialty, doctorAvatar, date, time, duration, type, status, notes, sessionType, unreadChat, onJoin, onChat, onViewDetail } = props;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["upcoming"];
  const isActive = status === "confirmed" || status === "upcoming";
  const isVirtual = type === "Virtual";
  const isLiveNow = date === "Today" && time === "Now";
  const isWaiting = date === "Today" && time === "Waiting";

  // ── Live Now card ──
  if (isLiveNow) {
    return (
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 shadow-lg shadow-primary-500/20">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/40">
          <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-white">{doctorName}</p>
              <p className="text-sm text-white/70 font-medium">{doctorSpecialty}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Now
            </span>
          </div>
          <p className="text-xs text-white/60 mt-2 bg-white/10 rounded-lg px-3 py-1.5 italic">&quot;{notes}&quot;</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onJoin}
              data-action="join-meeting"
              className="flex items-center gap-2 bg-white text-primary-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-all shadow-sm"
            >
              <Zap className="w-4 h-4 fill-primary-500" /> Join Meeting Now
            </button>
            <button
              onClick={onChat}
              className="flex items-center gap-2 bg-white/15 text-white border border-white/20 font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all relative"
            >
              <MessageCircle className="w-4 h-4" /> Chat
              {(unreadChat ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-primary-600">
                  {unreadChat}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting card ──
  if (isWaiting) {
    return (
      <div className="bg-gradient-to-r from-gold-400 to-gold-500 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 shadow-lg shadow-gold-400/20">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/40">
          <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-white">{doctorName}</p>
              <p className="text-sm text-white/80 font-medium">{doctorSpecialty}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/20">
              <Hourglass className="w-3 h-3 animate-spin" style={{ animationDuration: "3s" }} />
              Doctor joining soon
            </span>
          </div>
          <p className="text-xs text-white/70 mt-2 bg-white/10 rounded-lg px-3 py-1.5 italic">&quot;{notes}&quot;</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onJoin}
              data-action="join-meeting"
              className="flex items-center gap-2 bg-white text-gold-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-yellow-50 transition-all shadow-sm"
            >
              <Video className="w-4 h-4" /> Enter Waiting Room
            </button>
            <button
              onClick={onChat}
              className="flex items-center gap-2 bg-white/15 text-white border border-white/20 font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all relative"
            >
              <MessageCircle className="w-4 h-4" /> Chat
              {(unreadChat ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-gold-500">
                  {unreadChat}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard card ──
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-all group ${isActive ? "border-l-4 border-l-primary-500 border-slate-100" : "border-slate-100"}`}>
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
        <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            {doctorId ? (
              <Link href={`/doctor/${doctorId}`} className="font-semibold text-slate-800 hover:text-primary-600 transition-colors">
                {doctorName}
              </Link>
            ) : (
              <p className="font-semibold text-slate-800">{doctorName}</p>
            )}
            <p className="text-sm text-primary-600 font-medium">{doctorSpecialty}</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-primary-500" />
            {isNaN(Date.parse(date)) ? date : new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            {time} · {duration} min
          </span>
          <span className="flex items-center gap-1">
            {isVirtual ? <Video className="w-3.5 h-3.5 text-primary-500" /> : <MapPin className="w-3.5 h-3.5 text-primary-500" />}
            {sessionType || type}
          </span>
        </div>

        {notes && (
          <p className="text-xs text-slate-400 mt-2 italic bg-slate-50 rounded-lg px-3 py-1.5">&quot;{notes}&quot;</p>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {isActive && isVirtual && (
            <button onClick={onJoin} className="btn-primary text-xs py-2 px-4">
              <Video className="w-3.5 h-3.5" /> Join Call
            </button>
          )}
          {isActive && (
            <button onClick={onChat} className="btn-secondary text-xs py-2 px-4 relative">
              <MessageCircle className="w-3.5 h-3.5" /> Chat
              {(unreadChat ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadChat}
                </span>
              )}
            </button>
          )}
          {onViewDetail && (
            <button onClick={onViewDetail} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium ml-auto py-2 px-3 rounded-xl hover:bg-primary-50 transition-colors">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
