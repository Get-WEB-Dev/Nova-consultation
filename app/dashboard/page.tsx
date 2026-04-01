"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  ArrowRight,
  Star,
  Stethoscope,
  BookOpen,
  Video,
  MapPin,
  Zap,
  ChevronRight,
  Clock,
  Users,
  Heart,
  Shield,
  CheckCircle,
  Award,
  TrendingUp,
  Play,
  ThumbsUp,
  Eye,
  MessageCircle,
  Verified,
  BadgeCheck,
  GraduationCap,
  Languages,
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#1a3558";
const NAV_DARK = "#0c192c";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

// ── Specialty icons map ───────────────────────────────────────────────────────
const SPECIALTY_ICONS: Record<string, string> = {
  Cardiologist: "❤️",
  Dermatologist: "🧴",
  Neurologist: "🧠",
  Pediatrician: "👶",
  Orthopedist: "🦴",
  "General Practitioner": "🩺",
  Psychiatrist: "💭",
  Ophthalmologist: "👁️",
  Gynecologist: "🌸",
  Urologist: "💊",
};

// ─────────────────────────────────────────────────────────────────────────────
//  NEW NORMAL DOCTOR CARD (for Top Doctors grid)
// ─────────────────────────────────────────────────────────────────────────────
function NormalDoctorCard({ doc }: { doc: Doctor }) {
  return (
    <Link
      href={`/doctor/${doc.id}`}
      className="group flex flex-col bg-white rounded-2xl p-4 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ boxShadow: "0 2px 8px rgba(26,53,88,0.06)" }}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
          <Image
            src={doc.avatar}
            alt={doc.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
          {doc.status === "available" && (
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="font-extrabold text-[15px] text-slate-900 truncate">
              {doc.name}
            </h3>
            <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: SKY }} />
          </div>
          <p className="text-[12px] font-semibold text-slate-500 mb-2">
            {SPECIALTY_ICONS[doc.specialty] || "🩺"} {doc.specialty}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-[12px] font-bold text-slate-700">
                {doc.rating?.toFixed(1) || "5.0"}
              </span>
            </div>
            <span className="text-[14px] font-extrabold" style={{ color: NAV_BG }}>
              {doc.fee}
              <span className="text-[10px] text-slate-400 font-normal"> ETB</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  YOUTUBE-STYLE POST CARDS (Health Feed)
// ─────────────────────────────────────────────────────────────────────────────
function FeaturedPostCard({ post }: { post: Post }) {
  const imageUrl = (post as any).imageUrl || (post as any).thumbnail;
  const linkUrl = `/blogs/${(post as any).slug || post.id}`;
  const category = (post as any).tags?.[0] || "Health";

  return (
    <Link href={linkUrl} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300">
        {imageUrl && (
          <div className="relative w-full h-56 overflow-hidden bg-slate-100">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
          </div>
        )}
        <div className="p-5">
          {category && (
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3 inline-block"
              style={{ background: "#eff6ff", color: ACCENT }}
            >
              {category}
            </span>
          )}
          <h3 className="font-bold text-[18px] text-slate-800 leading-tight mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-4 line-clamp-3">
            {(post as any).content?.replace(/<[^>]*>?/gm, '').substring(0, 120) || "Expert insights on managing your health, written by certified medical professionals."}
          </p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="font-medium text-slate-500 flex items-center gap-1.5">
              {(post as any).doctorAvatar && (
                <Image src={(post as any).doctorAvatar} alt={post.doctorName} width={16} height={16} className="rounded-full" unoptimized />
              )}
              {post.doctorName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {(post as any).views || 0}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {(post as any).likes || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {(post as any).comments || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RelatedPostCard({ post }: { post: Post }) {
  const imageUrl = (post as any).imageUrl || (post as any).thumbnail;
  const linkUrl = `/blogs/${(post as any).slug || post.id}`;

  return (
    <Link href={linkUrl} className="group block">
      <div className="flex gap-3 bg-white rounded-xl p-3 border border-slate-100 hover:shadow-md transition-all">
        {imageUrl && (
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[13px] text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
            {post.title}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
            <span className="truncate max-w-[80px]">{post.doctorName}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              {(post as any).views || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-2.5 h-2.5" />
              {(post as any).comments || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Recommended Doctor Card (horizontal scroll) – unchanged ─────────────────
function RecommendedCard({ doc }: { doc: Doctor }) {
  return (
    <Link
      href={`/doctor/${doc.id}`}
      className="group flex-none w-[270px] bg-white rounded-3xl overflow-hidden border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ boxShadow: "0 2px 12px rgba(26,53,88,0.07)" }}
    >
      <div
        className="relative h-40 overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #cfe0ff 0%, #a8c8f8 100%)",
        }}
      >
        <Image
          src={doc.avatar}
          alt={doc.name}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(26,53,88,0.6) 0%, transparent 55%)",
          }}
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur px-2 py-1 rounded-full">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-slate-800">
              {doc.rating?.toFixed(1)}
            </span>
          </div>
        </div>
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
          style={{ background: "rgba(12,188,173,0.9)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1 mb-0.5">
          <h3 className="font-extrabold text-[14px] text-slate-900 truncate">
            {doc.name}
          </h3>
          <BadgeCheck
            className="w-3.5 h-3.5 flex-shrink-0"
            style={{ color: SKY }}
          />
        </div>
        <p
          className="text-[11px] font-semibold mb-2.5"
          style={{ color: ACCENT }}
        >
          {SPECIALTY_ICONS[doc.specialty] || "🩺"} {doc.specialty}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <GraduationCap className="w-2.5 h-2.5" />
            {Math.floor(Math.random() * 15 + 5)}+ yrs
          </span>
          <span className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Users className="w-2.5 h-2.5" />
            {Math.floor(Math.random() * 2000 + 500)}+
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-extrabold" style={{ color: NAV_BG }}>
              {doc.fee}{" "}
              <span className="text-[10px] text-slate-400 font-normal">
                ETB
              </span>
            </p>
          </div>
          <button
            className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold text-white flex items-center gap-1 transition-all hover:opacity-90"
            style={{ background: NAV_BG }}
          >
            <Video className="w-3 h-3" /> Consult
          </button>
        </div>
      </div>
    </Link>
  );
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
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
    .slice(0, 9); // take 9 for grid (3x3)
  const availableDoctors = doctors
    .filter((d) => d.status === "available")
    .slice(0, 8);

  // YouTube-style feed: first post = featured, next 3 = related
  const featuredPost = posts[0] ?? null;
  const relatedPosts = posts.slice(1, 4);

  return (
    <div className="min-h-screen pb-16" style={{ background: "#f0f4f9" }}>
      {/* HERO BAND (unchanged) */}
      <div
        style={{ background: NAV_BG }}
        className="px-4 sm:px-6 pt-8 pb-12 relative overflow-hidden"
      >
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(12,188,173,0.1) 0%, transparent 70%)",
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

        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold mb-5 border"
            style={{
              background: "rgba(12,188,173,0.12)",
              borderColor: "rgba(12,188,173,0.3)",
              color: SKY,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: SKY }}
            />
            {availableDoctors.length > 0
              ? `${availableDoctors.length} doctors available right now`
              : "2,000+ Verified Doctors Online"}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <h1
                className="font-extrabold text-white leading-tight mb-2"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}
              >
                Your Health, <span style={{ color: SKY }}>Expert Care</span>
              </h1>
              <p
                className="text-[14px] max-w-md"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Connect with verified specialists for private, professional
                consultations — from anywhere, anytime.
              </p>
            </div>

            <div className="flex-shrink-0 w-full sm:w-[340px]">
              <Link
                href="/doctors"
                className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 hover:bg-white/15 transition-all group"
              >
                <Search
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: SKY }}
                />
                <span
                  className="text-[13px] font-medium flex-1"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Search doctors, specialties…
                </span>
                <div
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold"
                  style={{ background: SKY, color: NAV_DARK }}
                >
                  Search
                </div>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { label: "Cardiology", icon: "❤️" },
              { label: "Dermatology", icon: "🧴" },
              { label: "Pediatrics", icon: "👶" },
              { label: "Neurology", icon: "🧠" },
              { label: "Orthopedics", icon: "🦴" },
              { label: "General", icon: "🩺" },
            ].map((s) => (
              <Link
                key={s.label}
                href={`/doctors?specialty=${encodeURIComponent(s.label)}`}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all hover:bg-white/15"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {s.icon} {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* PAGE BODY */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8 space-y-10">
        {/* ── Recommended For You (horizontal scroll) – unchanged ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-extrabold text-[16px] text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: SKY }} />
                Recommended For You
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Based on your health interests
              </p>
            </div>
            <Link
              href="/doctors"
              className="flex items-center gap-1 text-[12px] font-bold hover:underline"
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
                  className="flex-none w-[270px] h-64 bg-white rounded-3xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div
              className="flex gap-4 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {availableDoctors.map((doc) => (
                <RecommendedCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════
            TOP DOCTORS → NORMAL CARDS (grid)
        ══════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-extrabold text-[16px] text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: SKY }} />
                Top Rated Specialists
              </h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Highest rated, credential-verified doctors
              </p>
            </div>
            <Link
              href="/doctors"
              className="flex items-center gap-1 text-[12px] font-bold hover:underline"
              style={{ color: ACCENT }}
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 bg-white rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {topDoctors.map((doc) => (
                <NormalDoctorCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════
            HEALTH FEED → YOUTUBE STYLE (1 featured + 3 related)
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side: Featured Post (2/3 width on desktop) */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-extrabold text-[16px] text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: SKY }} />
                  Health Insights
                </h2>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  Expert articles from verified doctors
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-80 bg-white rounded-2xl animate-pulse" />
            ) : !featuredPost ? (
              <div
                className="bg-white border border-slate-100 rounded-2xl p-10 text-center"
                style={{ boxShadow: "0 1px 8px rgba(26,53,88,0.06)" }}
              >
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600 text-sm">
                  No articles yet
                </p>
              </div>
            ) : (
              <FeaturedPostCard post={featuredPost} />
            )}
          </section>

          {/* Right side: Related Posts (1/3 width) */}
          <aside className="space-y-4">
            <p
              className="text-[10px] font-extrabold uppercase tracking-widest mb-2"
              style={{ color: ACCENT }}
            >
              More from our network
            </p>
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-white rounded-xl animate-pulse"
                  />
                ))}
              </>
            ) : relatedPosts.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">
                No related posts
              </div>
            ) : (
              relatedPosts.map((post) => (
                <RelatedPostCard key={post.id} post={post} />
              ))
            )}
            <Link
              href="/blogs"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[12px] font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
            >
              View all articles <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </aside>
        </div>

        {/* Quick Actions Sidebar (originally inside a grid, now placed below health feed on desktop but we keep the original separate grid? 
            Actually the original had Health Feed + Sidebar grid. We already merged the health feed and related into one grid.
            The quick actions sidebar was in a separate aside. We'll put it below health feed on all devices for consistency.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{/* empty spacer */}</div>
          <aside>
            <div
              className="bg-white border border-slate-100 rounded-2xl p-4"
              style={{ boxShadow: "0 1px 8px rgba(26,53,88,0.06)" }}
            >
              <p
                className="text-[10px] font-extrabold uppercase tracking-widest mb-3"
                style={{ color: ACCENT }}
              >
                Quick Access
              </p>
              <div className="space-y-1">
                {[
                  {
                    icon: Stethoscope,
                    label: "Find a Doctor",
                    sub: "Browse all specialists",
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
          </aside>
        </div>
      </div>
    </div>
  );
}
