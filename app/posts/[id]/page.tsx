"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, CalendarPlus, Share2, ThumbsUp,
  Eye, Clock, Bookmark, ChevronRight,
  Play, Stethoscope, Star, Zap,
} from "lucide-react";
import type { Post } from "@/lib/types";
import PostCard from "@/components/ui/PostCard";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG  = "#1a3558";
const ACCENT  = "#1e4470";
const SKY     = "#0cbcad";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost]               = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading]         = useState(true);
  const [liked, setLiked]             = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    fetch("/api/posts")
      .then(r => r.json())
      .then(data => {
        const all: Post[] = data.data || data;
        const found = all.find(p => p.id === params.id);
        setPost(found || null);
        setRelatedPosts(all.filter(p => p.id !== params.id).slice(0, 8));
        setLoading(false);
      });
  }, [params.id]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen pb-10" style={{ background: "#eef2f7" }}>
        <div style={{ background: NAV_BG, height: 56 }} />
        <div className="max-w-6xl mx-auto px-4 py-5 grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl animate-pulse" style={{ aspectRatio: "16/9" }} />
            <div className="bg-white rounded-2xl h-32 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl h-24 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#eef2f7" }}>
        <p className="text-slate-500 mb-4 text-sm">Post not found</p>
        <Link href="/dashboard" className="text-sm font-extrabold text-white px-5 py-2.5 rounded-xl" style={{ background: NAV_BG }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const viewCount   = (post as any).views ?? Math.floor(Math.random() * 5000 + 200);
  const likeCount   = (post as any).likes ?? Math.floor(Math.random() * 400 + 20);
  const readTime    = (post as any).readTime ?? "4 min read";
  const publishDate = (post as any).date ?? (post as any).createdAt
    ? new Date((post as any).date ?? (post as any).createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Recently";

  return (
    <div className="min-h-screen pb-12" style={{ background: "#eef2f7" }}>

      {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
      <header style={{ background: NAV_BG }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="font-extrabold text-white text-base">MediBook</span>
          <button
            onClick={() => navigator.share?.({ title: post.title, url: window.location.href })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all"
            style={{ background: "rgba(255,255,255,0.1)", color: "white", borderColor: "rgba(255,255,255,0.2)" }}
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </header>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5">
        <div className="grid lg:grid-cols-3 gap-5">

          {/* ── LEFT: Main content (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Video player OR thumbnail */}
            <div className="bg-black rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}>
              {post.video ? (
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <video
                    src={post.video}
                    poster={(post as any).thumbnail ?? undefined}
                    controls
                    className="w-full h-full object-contain"
                    style={{ background: "black" }}
                  />
                </div>
              ) : (post as any).thumbnail ? (
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={(post as any).thumbnail}
                    alt={post.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Play overlay hint */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                      <Play className="w-7 h-7 fill-slate-800 text-slate-800 ml-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/9", background: `linear-gradient(135deg, ${NAV_BG} 0%, ${ACCENT} 100%)` }}>
                  <Stethoscope className="w-16 h-16" style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
              )}
            </div>

            {/* Title + meta */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
              {/* Category pill */}
              {(post as any).category && (
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3" style={{ background: "#eff6ff", color: ACCENT }}>
                  {(post as any).category}
                </span>
              )}

              <h1 className="font-extrabold text-slate-900 leading-snug mb-3" style={{ fontSize: "clamp(1rem, 3vw, 1.35rem)" }}>
                {post.title}
              </h1>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
                <span className="flex items-center gap-1 text-[12px] text-slate-400">
                  <Eye className="w-3.5 h-3.5" /> {viewCount.toLocaleString()} views
                </span>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1 text-[12px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> {readTime}
                </span>
                <span className="text-slate-200">·</span>
                <span className="text-[12px] text-slate-400">{publishDate}</span>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-3 border-t border-dashed border-slate-100">
                <button
                  onClick={() => setLiked(l => !l)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95"
                  style={liked
                    ? { background: "#eff6ff", color: ACCENT, borderColor: "#bfdbfe" }
                    : { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
                  {likeCount + (liked ? 1 : 0)}
                </button>

                <button
                  onClick={() => setSaved(s => !s)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95"
                  style={saved
                    ? { background: "#eff6ff", color: ACCENT, borderColor: "#bfdbfe" }
                    : { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-current" : ""}`} />
                  {saved ? "Saved" : "Save"}
                </button>

                <button
                  onClick={() => navigator.share?.({ title: post.title, url: window.location.href })}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95"
                  style={{ background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }}
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>

            {/* Post body content */}
            {(post as any).content || (post as any).body || (post as any).excerpt ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>About this post</h3>
                <p className="text-[14px] text-slate-600 leading-relaxed">
                  {(post as any).content ?? (post as any).body ?? (post as any).excerpt}
                </p>
                {(post.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dashed border-slate-100">
                    {(post.tags ?? []).map((tag: string) => (
                      <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                        style={{ background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Doctor card — inline below content on mobile */}
            <div className="lg:hidden bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT}, ${SKY})` }} />
              <div className="p-4 flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)" }}>
                  <Image src={post.doctorAvatar} alt={post.doctorName} fill className="object-cover object-top" unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[14px] text-slate-900 truncate">{post.doctorName}</p>
                  <p className="text-[11px] font-semibold truncate" style={{ color: ACCENT }}>{post.doctorSpecialty}</p>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <Link href={`/doctor/${post.doctorId}`}
                  className="flex-1 flex items-center justify-center py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95">
                  View Profile
                </Link>
                <Link href={`/doctor/${post.doctorId}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold text-white transition-all active:scale-95"
                  style={{ background: NAV_BG }}>
                  <Zap className="w-3.5 h-3.5" /> Consult Now
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Sidebar (1/3) ── */}
          <div className="space-y-4">

            {/* Doctor card — desktop sidebar */}
            <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
              {/* Accent bar */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT}, ${SKY})` }} />
              <div className="p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>Doctor</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)" }}>
                    <Image src={post.doctorAvatar} alt={post.doctorName} fill className="object-cover object-top" unoptimized />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[14px] text-slate-900 truncate">{post.doctorName}</p>
                    <p className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: ACCENT }}>{post.doctorSpecialty}</p>
                  </div>
                </div>
                <div className="border-t border-dashed border-slate-100 pt-3 flex gap-2">
                  <Link href={`/doctor/${post.doctorId}`}
                    className="flex-1 flex items-center justify-center py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95">
                    Profile
                  </Link>
                  <Link href={`/doctor/${post.doctorId}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-extrabold text-white transition-all active:scale-95"
                    style={{ background: NAV_BG }}>
                    <Zap className="w-3 h-3" /> Consult
                  </Link>
                </div>
              </div>
            </div>

            {/* Related posts — YouTube sidebar style */}
            {relatedPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-[14px] text-slate-900">More Posts</h3>
                  <Link href="/dashboard#posts" className="flex items-center gap-0.5 text-[11px] font-bold transition-colors" style={{ color: ACCENT }}>
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {relatedPosts.map(rp => (
                    <Link
                      key={rp.id}
                      href={`/posts/${rp.id}`}
                      className="flex gap-3 bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-28 flex-shrink-0 overflow-hidden" style={{ background: "linear-gradient(135deg, #cfe0ff 0%, #a8c8f8 100%)" }}>
                        {(rp as any).thumbnail ? (
                          <Image src={(rp as any).thumbnail} alt={rp.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ minHeight: 72 }}>
                            <Play className="w-5 h-5" style={{ color: ACCENT, opacity: 0.5 }} />
                          </div>
                        )}
                        {/* Duration badge */}
                        {(rp as any).duration && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-white">
                            {(rp as any).duration}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-2.5 min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors mb-1.5">
                          {rp.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{rp.doctorName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {(rp as any).views && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" /> {(rp as any).views}
                            </span>
                          )}
                          {(rp as any).readTime && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {(rp as any).readTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}