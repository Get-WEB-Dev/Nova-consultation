"use client";
import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import {
  Heart, MessageCircle, Plus, X, Loader2, Bookmark,
  MoreHorizontal, Send, Share2, Edit3, Image as Img, Sparkles
} from "lucide-react";

interface Post {
  id: string; doctorId: string; doctorName: string; doctorSpecialty: string;
  title: string; content: string; image?: string | null;
  likes: number; comments: number; tags: string[]; created_at: string;
  liked?: boolean; saved?: boolean;
}

const TAGS = ["all", "cardiology", "nutrition", "mental-health", "pediatrics", "prevention", "dermatology", "general", "tips"];

function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
}

function PostCard({ post, me, onUpdate }: { post: Post; me: string; onUpdate: (p: Post) => void }) {
  const [cmt, setCmt] = useState(false);
  const [cmtTxt, setCmtTxt] = useState("");
  const [exp, setExp] = useState(false);
  const long = post.content.length > 220;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">{post.doctorName[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 dark:text-white text-sm">{post.doctorName}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-primary-500 font-semibold">{post.doctorSpecialty}</p>
            <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
            <p className="text-xs text-slate-400">{ago(post.created_at)}</p>
          </div>
        </div>
        <button className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><MoreHorizontal className="w-4 h-4 text-slate-400" /></button>
      </div>
      {post.image && <div className="aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800"><img src={post.image} alt={post.title} className="w-full h-full object-cover" /></div>}
      <div className="px-4 pb-1 pt-3">
        <p className="font-bold text-slate-800 dark:text-white text-base mb-2 leading-tight">{post.title}</p>
        <p className={`text-slate-600 dark:text-slate-300 text-sm leading-relaxed ${!exp && long ? "line-clamp-3" : ""}`}>{post.content}</p>
        {long && <button onClick={() => setExp(!exp)} className="text-primary-500 text-xs font-semibold mt-1 hover:text-primary-600">{exp ? "Show less" : "Read more"}</button>}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.slice(0, 5).map(t => <span key={t} className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-0.5 rounded-full">#{t}</span>)}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400">
        <span>{post.likes} likes</span><span>{post.comments} comments</span>
      </div>
      <div className="flex items-center border-t border-slate-50 dark:border-slate-800 px-2 py-1.5">
        <button onClick={() => onUpdate({ ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${post.liked ? "text-rose-500" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
          <Heart className={`w-4 h-4 ${post.liked ? "fill-rose-500" : ""}`} />Like
        </button>
        <button onClick={() => setCmt(!cmt)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <MessageCircle className="w-4 h-4" />Comment
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <Share2 className="w-4 h-4" />Share
        </button>
        <button onClick={() => onUpdate({ ...post, saved: !post.saved })}
          className={`flex items-center justify-center p-2 rounded-xl transition-all ${post.saved ? "text-primary-600" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
          <Bookmark className={`w-4 h-4 ${post.saved ? "fill-primary-600" : ""}`} />
        </button>
      </div>
      {cmt && (
        <div className="px-4 pb-3 border-t border-slate-50 dark:border-slate-800 pt-2">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
            <input value={cmtTxt} onChange={e => setCmtTxt(e.target.value)} placeholder="Write a comment…" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none" />
            <button disabled={!cmtTxt.trim()} className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center disabled:opacity-40 flex-shrink-0"><Send className="w-3.5 h-3.5 text-white" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tag, setTag] = useState("all");
  const [form, setForm] = useState({ title: "", content: "", tags: [] as string[] });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const u = getUser(); if (!u) return; setUser(u);
    // Fetch doctor_profiles.id from auth user ID
    fetch(`/api/doctor/profile?doctorId=${u.id}`)
      .then(r => r.json())
      .then(j => { if (j.data?.id) setDoctorProfileId(j.data.id); })
      .catch(() => { });
    fetch("/api/posts").then(r => r.json()).then(j => setPosts((j.data || []).map((p: Post) => ({ ...p, liked: false, saved: false })))).catch(() => { }).finally(() => setLoading(false));
  }, []);

  const doPost = async () => {
    if (!user || !doctorProfileId || !form.title.trim() || !form.content.trim()) return;
    setPosting(true);
    try {
      const r = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId: doctorProfileId, ...form }) });
      const j = await r.json();
      if (j.data) { setPosts(p => [{ ...j.data, doctorName: user.name, doctorSpecialty: "", liked: false, saved: false }, ...p]); setCreating(false); setForm({ title: "", content: "", tags: [] }); }
    } catch { }
    setPosting(false);
  };

  const filtered = tag === "all" ? posts : posts.filter(p => p.tags.includes(tag));

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-slate-800 dark:text-white">Medical Blog</h1>
          <p className="text-xs text-slate-400 mt-0.5">Share knowledge with the community</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 bg-primary-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm shadow-primary-600/20 hover:bg-primary-700 transition-colors active:scale-95">
          <Plus className="w-4 h-4" /><span className="hidden sm:block">Write Post</span><span className="sm:hidden">Post</span>
        </button>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {TAGS.map(t => (
          <button key={t} onClick={() => setTag(t)}
            className={`flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${tag === t ? "bg-primary-600 text-white shadow-sm" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary-200 hover:text-primary-600"}`}>
            {t === "all" ? "All Posts" : `#${t}`}
          </button>
        ))}
      </div>

      {loading
        ? <div className="space-y-4">{[1, 2].map(i => <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl h-52 animate-shimmer border border-slate-100 dark:border-slate-800" />)}</div>
        : filtered.length === 0
          ? <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Sparkles className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">No posts yet</p>
            <button onClick={() => setCreating(true)} className="text-primary-500 text-sm font-semibold mt-2">Be the first to post</button>
          </div>
          : <div className="space-y-4">{filtered.map(p => <PostCard key={p.id} post={p} me={user?.id || ""} onUpdate={u => setPosts(prev => prev.map(x => x.id === u.id ? u : x))} />)}</div>
      }

      {/* Create modal */}
      {creating && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setCreating(false)} />
          <div className="fixed inset-x-4 top-14 z-50 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg mx-auto animate-scale-in">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <Edit3 className="w-4 h-4 text-primary-600" />
              <p className="font-bold text-slate-800 dark:text-white">Write a Post</p>
              <button onClick={() => setCreating(false)} className="ml-auto p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Give your post a title…" className="w-full text-lg font-bold text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 border-b-2 border-slate-100 dark:border-slate-800 focus:border-primary-200 pb-2 focus:outline-none transition-colors bg-transparent" />
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Share your medical insights, tips, or case studies…" rows={5} className="w-full text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 focus:outline-none resize-none leading-relaxed bg-transparent" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add Tags</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.filter(t => t !== "all").map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }))}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${form.tags.includes(t) ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"}`}>
                      #{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-500 transition-colors"><Img className="w-4 h-4" />Add image</button>
              <button onClick={doPost} disabled={posting || !form.title.trim() || !form.content.trim()}
                className="flex items-center gap-2 bg-primary-600 text-white text-sm font-bold px-5 py-2 rounded-xl disabled:opacity-50 transition-opacity shadow-sm hover:bg-primary-700">
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Publish
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
