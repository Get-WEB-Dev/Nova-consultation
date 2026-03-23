"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  ArrowRight,
  Star,
  Stethoscope,
  BookOpen,
  Video,
  MapPin,
  Zap,
  Bell,
  ChevronRight,
  Clock,
  Users,
  Heart,
  Shield,
  CheckCircle,
  Activity,
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";
import { getUser } from "@/lib/supabase/auth";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

const STATUS_COLOR: Record<string, string> = {
  available: "#22c55e",
  busy: "#f59e0b",
  offline: "#94a3b8",
  in_consultation: "#a855f7",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  busy: "Busy",
  in_consultation: "In Session",
  offline: "Offline",
};

const QUICK_LINKS = [
  {
    label: "Dermatology",
    icon: "🧴",
    href: "/doctors?specialty=Dermatologist",
  },
  { label: "Cardiology", icon: "❤️", href: "/doctors?specialty=Cardiologist" },
  { label: "Neurology", icon: "🧠", href: "/doctors?specialty=Neurologist" },
  { label: "Pediatrics", icon: "👶", href: "/doctors?specialty=Pediatrician" },
  { label: "Orthopedics", icon: "🦴", href: "/doctors?specialty=Orthopedist" },
  {
    label: "General",
    icon: "🩺",
    href: "/doctors?specialty=General+Practitioner",
  },
];

// ── Doctor slide card ─────────────────────────────────────────────────────────
function DoctorSlide({ doc, onOpen }: { doc: Doctor; onOpen: () => void }) {
  const statusColor = STATUS_COLOR[doc.status] ?? "#94a3b8";
  const statusLabel = STATUS_LABEL[doc.status] ?? "Offline";
  const isOffline = doc.status === "offline";

  return (
    <div
      className="flex-none w-[200px] sm:w-[220px] bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
      onClick={onOpen}
    >
      {/* Photo */}
      <div
        className="relative h-36 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
        }}
      >
        <Image
          src={doc.avatar}
          alt={doc.name}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          unoptimized
        />
        {/* Status badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/95 shadow-sm">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor }}
          />
          {statusLabel}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-extrabold text-[13px] text-slate-900 truncate">
          {doc.name}
        </p>
        <p
          className="text-[11px] font-semibold truncate mb-1.5"
          style={{ color: ACCENT }}
        >
          {doc.specialty}
        </p>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-700">
              {doc.rating.toFixed(1)}
            </span>
          </div>
          <span
            className="text-[11px] font-extrabold"
            style={{ color: ACCENT }}
          >
            {doc.fee}{" "}
            <span className="text-[9px] text-slate-400 font-medium">Birr</span>
          </span>
        </div>
        <button
          className="w-full py-1.5 rounded-lg text-[11px] font-extrabold text-white transition-all active:scale-95"
          style={{ background: isOffline ? "#94a3b8" : NAV_BG }}
        >
          {isOffline ? "Remind Me" : "Consult Now"}
        </button>
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostItem({ post }: { post: Post }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      {(post as any).image && (
        <div className="relative w-24 sm:w-32 flex-shrink-0 overflow-hidden bg-slate-100">
          <Image
            src={(post as any).image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div>
          {(post as any).category && (
            <span
              className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 inline-block"
              style={{ background: "#eff6ff", color: ACCENT }}
            >
              {(post as any).category}
            </span>
          )}
          <p className="font-bold text-[13px] text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
            {post.title}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-[10px] text-slate-400 truncate">
            {post.doctorName}
          </p>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 flex-shrink-0">
            <Clock className="w-2.5 h-2.5" />{" "}
            {(post as any).readTime || "3 min"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/doctors").then((r) => r.json()),
      fetch("/api/posts").then((r) => r.json()),
    ]).then(([docs, postsRes]) => {
      setDoctors(docs.data || docs);
      setPosts(postsRes.data || postsRes);
      setLoading(false);
    });
  }, []);

  const topDoctors = [...doctors]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10);
  const availableDoctors = doctors
    .filter((d) => d.status === "available")
    .slice(0, 10);

  const filteredPosts = search.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.doctorName.toLowerCase().includes(search.toLowerCase()) ||
          (p.tags || []).some((t: string) =>
            t.toLowerCase().includes(search.toLowerCase()),
          ),
      )
    : posts;

  return (
    <div className="min-h-screen pb-10" style={{ background: "#eef2f7" }}>
      {/* ══════════════════════════════════════════════════════
          HERO BAND — dark navy (no greeting text)
      ══════════════════════════════════════════════════════ */}
      <div
        style={{ background: NAV_BG }}
        className="px-4 sm:px-6 pt-6 pb-10 relative overflow-hidden"
      >
        {/* Background glows matching landing page */}
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)",
            transform: "translate(20%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,113,194,0.15) 0%, transparent 70%)",
            transform: "translate(-20%, 30%)",
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Live badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-4 border"
            style={{
              background: "rgba(56,189,248,0.12)",
              borderColor: "rgba(56,189,248,0.3)",
              color: SKY,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: SKY }}
            />
            {availableDoctors.length > 0
              ? `${availableDoctors.length} doctors available right now`
              : "2,000+ Verified Doctors"}
          </div>

          <h1
            className="font-extrabold text-white leading-tight mb-1.5"
            style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)" }}
          >
            Find & Book <span style={{ color: SKY }}>Top Doctors</span>
          </h1>
          <p
            className="text-[14px] mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Search by name, specialty, or health topic.
          </p>

          {/* Search bar — booking.com style with sky border */}
          <div
            className="flex items-center bg-white rounded-xl overflow-hidden border-2"
            style={{
              borderColor: SKY,
              boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex-1 flex items-center gap-2.5 px-4 py-3.5">
              <Search
                className="w-4 h-4 flex-shrink-0"
                style={{ color: ACCENT }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search doctors or health articles…"
                className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400"
                style={{ color: "#1e293b" }}
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-4 h-4 text-slate-300" />
                </button>
              )}
            </div>
            <Link
              href={
                search ? `/doctors?q=${encodeURIComponent(search)}` : "/doctors"
              }
              className="px-5 py-3.5 text-[13px] font-extrabold text-white flex-shrink-0 flex items-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: NAV_DARK }}
            >
              <Search className="w-3.5 h-3.5" /> Search
            </Link>
          </div>

          {/* Quick specialty chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["Cardiology", "Dermatology", "Pediatrics", "Neurology"].map(
              (s) => (
                <Link
                  key={s}
                  href={`/doctors?specialty=${encodeURIComponent(s)}`}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all hover:bg-white/20"
                  style={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {s}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          QUICK SPECIALTY FILTER BAR — sticky
      ══════════════════════════════════════════════════════ */}
      <div
        className="bg-white border-b border-slate-200 sticky top-0 z-20"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
          <div
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            <Link
              href="/doctors"
              className="flex-shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap"
              style={{
                background: NAV_BG,
                color: "white",
                borderColor: NAV_BG,
              }}
            >
              🏥 All Doctors
            </Link>
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.label}
                href={q.href}
                className="flex-shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap hover:border-blue-300 hover:text-blue-700"
                style={{
                  background: "white",
                  color: "#475569",
                  borderColor: "#e2e8f0",
                }}
              >
                {q.icon} {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAGE BODY
      ══════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* ── Consult Now CTA card ── */}
        <div
          className="relative rounded-2xl overflow-hidden px-5 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${NAV_BG} 0%, #0055b3 100%)`,
            boxShadow: "0 4px 20px rgba(0,53,128,0.3)",
          }}
        >
          {/* Glow */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%)",
              transform: "translate(20%, -30%)",
            }}
          />
          <div className="relative z-10">
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest mb-1"
              style={{ color: SKY }}
            >
              Instant Access
            </p>
            <h2 className="font-extrabold text-white text-[16px] sm:text-[18px] leading-tight mb-1">
              Consult a doctor now
            </h2>
            <p
              className="text-[12px]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {availableDoctors.length > 0
                ? `${availableDoctors.length} doctors available right now`
                : "Book your next appointment instantly"}
            </p>
          </div>
          <Link
            href="/doctors"
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-extrabold transition-all active:scale-95 hover:opacity-90 relative z-10"
            style={{ background: SKY, color: NAV_DARK }}
          >
            <Zap className="w-4 h-4" /> Find Doctor
          </Link>
        </div>

        {/* ── Trust stats row — matches landing page trust band ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: NAV_BG,
            boxShadow: "0 2px 12px rgba(0,53,128,0.2)",
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
            {[
              { icon: Users, value: "2,000+", label: "Verified Doctors" },
              { icon: CheckCircle, value: "50K+", label: "Happy Patients" },
              { icon: Shield, value: "24/7", label: "Available" },
              { icon: Star, value: "4.9★", label: "Avg. Rating" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center py-4 px-3 text-center"
              >
                <s.icon className="w-4 h-4 mb-1.5" style={{ color: SKY }} />
                <p className="font-extrabold text-white text-[16px] leading-none">
                  {s.value}
                </p>
                <p
                  className="text-[10px] font-medium mt-0.5"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Rated Doctors ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-extrabold text-[15px] text-slate-900">
                Top Rated Doctors
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Highest rated, verified specialists
              </p>
            </div>
            <Link
              href="/doctors"
              className="flex items-center gap-1 text-[12px] font-bold"
              style={{ color: ACCENT }}
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex-none w-[200px] h-56 bg-white rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div
              className="flex gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {topDoctors.map((doc) => (
                <DoctorSlide
                  key={doc.id}
                  doc={doc}
                  onOpen={() => (window.location.href = `/doctor/${doc.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Available Now ── */}
        {!loading && availableDoctors.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-extrabold text-[15px] text-slate-900">
                  Available Right Now
                </h2>
              </div>
              <Link
                href="/doctors?status=available"
                className="flex items-center gap-1 text-[12px] font-bold"
                style={{ color: ACCENT }}
              >
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div
              className="flex gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {availableDoctors.slice(0, 8).map((doc) => (
                <DoctorSlide
                  key={doc.id}
                  doc={doc}
                  onOpen={() => (window.location.href = `/doctor/${doc.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Two-col: Health Feed + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Health Feed — 2/3 */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-extrabold text-[15px] text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" style={{ color: ACCENT }} />{" "}
                  Health Feed
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Expert insights from our doctors
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-white rounded-2xl animate-pulse"
                  />
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div
                className="bg-white border border-slate-200 rounded-2xl p-8 text-center"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-600 text-sm">
                  No articles found
                </p>
                <button
                  onClick={() => setSearch("")}
                  className="text-[12px] font-bold mt-2 underline underline-offset-2"
                  style={{ color: ACCENT }}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.slice(0, 6).map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
                {filteredPosts.length > 6 && (
                  <div className="text-center pt-2">
                    <Link
                      href="/blogs"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      View all articles <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sidebar — 1/3 */}
          <aside className="space-y-4">
            {/* Quick Actions — white card with colored icons like landing specialty cards */}
            <div
              className="bg-white border border-slate-200 rounded-2xl p-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p
                className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                style={{ color: ACCENT }}
              >
                Quick Actions
              </p>
              <div className="space-y-1.5">
                {[
                  {
                    icon: Stethoscope,
                    label: "Find a Doctor",
                    sub: "Browse specialists",
                    href: "/doctors",
                    bg: "#eff6ff",
                    color: ACCENT,
                  },
                  {
                    icon: Video,
                    label: "Video Consult",
                    sub: "Start a session now",
                    href: "/doctors",
                    bg: "#f0fdf4",
                    color: "#22c55e",
                  },
                  {
                    icon: Heart,
                    label: "Saved Doctors",
                    sub: "Your saved list",
                    href: "/doctors?saved=1",
                    bg: "#fdf2f8",
                    color: "#ec4899",
                  },
                  {
                    icon: Clock,
                    label: "Consultation History",
                    sub: "Past visits",
                    href: "/history",
                    bg: "#fff7ed",
                    color: "#f97316",
                  },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: action.bg }}
                    >
                      <action.icon
                        className="w-4 h-4"
                        style={{ color: action.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-800 leading-none">
                        {action.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {action.sub}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Why MediBook — dark navy card matching landing trust band */}
            <div
              className="rounded-2xl p-4 border"
              style={{
                background: NAV_BG,
                boxShadow: "0 2px 12px rgba(0,53,128,0.2)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                style={{ color: SKY }}
              >
                Why MediBook
              </p>
              <div className="space-y-3">
                {[
                  {
                    icon: Shield,
                    label: "Verified Doctors",
                    desc: "Licensed & credential-checked",
                  },
                  {
                    icon: Clock,
                    label: "Available 24/7",
                    desc: "Any time, day or night",
                  },
                  {
                    icon: CheckCircle,
                    label: "Secure & Private",
                    desc: "End-to-end encrypted data",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(56,189,248,0.15)" }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: SKY }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white leading-none">
                        {item.label}
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA inside card */}
              <Link
                href="/doctors"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[12px] font-extrabold transition-all hover:opacity-90 active:scale-95"
                style={{ background: SKY, color: NAV_DARK }}
              >
                <Zap className="w-3.5 h-3.5" /> Book Now — It's Free
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
