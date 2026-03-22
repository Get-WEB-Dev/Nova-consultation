"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, X, Sparkles, BookOpen, ArrowRight,
  Filter, PlayCircle
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";
import DoctorCard from "@/components/ui/DoctorCard";
import PostCard from "@/components/ui/PostCard";

export default function DashboardPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/doctors").then(r => r.json()),
      fetch("/api/posts").then(r => r.json()),
    ]).then(([docs, postsRes]) => {
      setDoctors(docs.data || docs);
      setPosts(postsRes.data || postsRes);
      setLoading(false);
    });
  }, []);

  const featured = [...doctors]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  const filteredPosts = search.trim()
    ? posts.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    : posts;

  return (
    <div className="animate-fade-up space-y-10 pb-safe">

      {/* ── Search Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">
            Discover <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">World-Class Care</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Find top specialists and health insights.</p>
        </div>

        <div className="w-full md:w-auto flex-1 max-w-lg relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doctors or health articles..."
            className="w-full pl-14 pr-12 py-4 bg-white shadow-sm border border-slate-200 rounded-2xl focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-500/10 text-slate-700 placeholder-slate-400 font-medium transition-all duration-300"
          />
          {search ? (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          ) : (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer transition-colors">
              <Filter className="w-4 h-4 text-slate-500" />
            </div>
          )}
        </div>
      </div>

      {/* ── Recommended Doctors ─────────────────────────────── */}
      <section className="relative">
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-100 to-amber-50 flex items-center justify-center ring-4 ring-gold-50/50 shadow-inner">
              <Sparkles className="w-6 h-6 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Top Recommended Doctors</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Verified specialists with outstanding ratings</p>
            </div>
          </div>
          <Link href="/doctors" className="hidden sm:flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-full transition-all">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-72 w-72 rounded-[2rem] flex-shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x">
            {featured.map(doc => (
              <div key={doc.id} className="flex-none w-72 snap-start transform transition-transform duration-300 hover:-translate-y-2">
                <DoctorCard {...doc} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Featured Video/Promo ───────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 group cursor-pointer shadow-2xl shadow-slate-900/20 my-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-transparent z-10 opacity-90 transition-opacity group-hover:opacity-80" />
        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center mix-blend-overlay" />

        <div className="relative z-20 p-8 sm:p-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
          <div>
            <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase tracking-wider mb-5 border border-white/20 shadow-sm">
              Nova Care Plus
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight tracking-tight">24/7 Priority Access</h3>
            <p className="text-primary-100 max-w-sm text-lg line-clamp-2">Get instant video consultations anytime, anywhere with our premium care plan.</p>
          </div>

          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-white flex items-center justify-center text-primary-600 shadow-xl group-hover:scale-110 transition-transform duration-300">
            <PlayCircle className="w-10 h-10 fill-current text-primary-600" />
          </div>
        </div>
      </section>

      {/* ── Health Feed ─────────────────────────────────────── */}
      <section id="posts">
        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center ring-4 ring-teal-50/50 shadow-inner">
              <BookOpen className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Health Feed</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">Expert insights for a healthier life</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-80 rounded-[2rem]" />)}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-dashed border-slate-300 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <p className="font-bold text-slate-800 text-xl">No articles found</p>
            <p className="text-slate-500 max-w-sm mt-3 text-lg">Try adjusting your search terms to explore our expansive library of health insights.</p>
            <button onClick={() => setSearch("")} className="mt-8 font-bold text-primary-600 bg-primary-50 px-8 py-3 rounded-full hover:bg-primary-100 transition-colors shadow-sm">Clear search</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map(post => <PostCard key={post.id} {...post} />)}
          </div>
        )}
      </section>
    </div>
  );
}