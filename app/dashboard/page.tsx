"use client";

import { useEffect, useState } from "react";
import DoctorCard from "@/components/ui/DoctorCard";
import PostCard from "@/components/ui/PostCard";
import OnboardingGuide from "@/components/ui/OnboardingGuide";
import Link from "next/link";
import {
  Sparkles, ArrowRight, Calendar, Video,
  Newspaper, Sun, Moon, CloudSun,
  MessageCircle, Bookmark, Search, X,
} from "lucide-react";
import type { Doctor, Post } from "@/lib/types";
import { getUser } from "@/lib/supabase/auth";

type Lang = "en" | "am";

const T = {
  en: {
    recommended: "Recommended Doctors",
    viewAll: "View all",
    latestPosts: "Latest from Doctors",
    quickActions: "Quick Actions",
    bookAppt: "My Consultations",
    browseBlogs: "Browse Blogs",
    startVideo: "Find a Doctor",
    savedDoctors: "Saved Doctors",
    subtitle: "Here's what's happening with your health today.",
    searchPlaceholder: "Search health articles...",
    noResults: "No articles found for",
    clearSearch: "Clear search",
  },
  am: {
    recommended: "የሚመከሩ ዶክተሮች",
    viewAll: "ሁሉ ይመልከቱ",
    latestPosts: "ከዶክተሮች የቅርብ ጊዜ",
    quickActions: "ፈጣን ተግባራት",
    bookAppt: "ምክክሮቼ",
    browseBlogs: "ብሎጎች ይመልከቱ",
    startVideo: "ዶክተር ፈልግ",
    savedDoctors: "የተቀመጡ ዶክተሮች",
    subtitle: "ዛሬ ከጤናዎ ጋር የሚሆነው ይህ ነው።",
    searchPlaceholder: "የጤና ጽሑፎችን ፈልግ...",
    noResults: "ምንም ጽሑፎች አልተገኙም",
    clearSearch: "ፍለጋ ሰርዝ",
  },
} as const;

function getGreeting(lang: Lang): { text: string } {
  const hour = new Date().getHours();
  if (lang === "am") {
    if (hour < 12) return { text: "እንደምን አደሩ 👋" };
    if (hour < 17) return { text: "እንደምን ዋሉ 👋" };
    return { text: "እንደምን አመሹ 👋" };
  }
  if (hour < 12) return { text: "Good morning 👋" };
  if (hour < 17) return { text: "Good afternoon 👋" };
  return { text: "Good evening 👋" };
}

export default function DashboardPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [blogSearch, setBlogSearch] = useState("");
  const [savedDoctorIds, setSavedDoctorIds] = useState<string[]>([]);
  const [savedDoctorsData, setSavedDoctorsData] = useState<Doctor[]>([]);

  const t = T[lang];
  const greeting = getGreeting(lang);

  useEffect(() => {
    const u = getUser();
    if (u) setUserName(u.name);
    const handler = async () => {
      const u2 = getUser();
      setUserName(u2?.name || "");
      // Re-fetch saved doctors when auth state changes
      if (u2) {
        try {
          const res = await fetch(`/api/saved-doctors?patientId=${u2.id}`);
          const json = await res.json();
          const ids: string[] = json.data ?? [];
          setSavedDoctorIds(ids);
          setSavedDoctorsData((prev) => {
            // We don't have allDocs here, so filter existing doctors state
            return prev; // will be refreshed on next full load
          });
        } catch { /* ignore */ }
      } else {
        setSavedDoctorIds([]);
        setSavedDoctorsData([]);
      }
    };
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("hc-lang") as Lang | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  useEffect(() => {
    async function loadData() {
      // Get current user for saved doctors
      const u = getUser();

      const [docsRes, postsRes, savedRes] = await Promise.all([
        fetch("/api/doctors").then((r) => r.json()),
        fetch("/api/posts").then((r) => r.json()),
        // Only fetch saved doctors if logged in
        u
          ? fetch(`/api/saved-doctors?patientId=${u.id}`).then((r) => r.json()).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const allDocs: Doctor[] = docsRes.data || docsRes;
      setDoctors(allDocs);
      setPosts(postsRes.data || postsRes);

      const ids: string[] = savedRes.data ?? [];
      setSavedDoctorIds(ids);
      setSavedDoctorsData(allDocs.filter((d: Doctor) => ids.includes(d.id)));
    }
    loadData();
  }, []);

  const featuredDoctors = [...doctors].sort((a, b) => {
    const order: Record<string, number> = { available: 0, busy: 1, in_consultation: 2, offline: 3 };
    return (order[(a as any).status] ?? 3) - (order[(b as any).status] ?? 3);
  }).slice(0, 6);

  const filteredPosts = blogSearch.trim()
    ? posts.filter((p) =>
      p.title.toLowerCase().includes(blogSearch.toLowerCase()) ||
      p.content.toLowerCase().includes(blogSearch.toLowerCase()) ||
      p.doctorName.toLowerCase().includes(blogSearch.toLowerCase()) ||
      (p.tags || []).some((tag) => tag.toLowerCase().includes(blogSearch.toLowerCase()))
    )
    : posts;

  return (
    <div className="space-y-8 animate-fade-up">
      <OnboardingGuide page="dashboard" />

      {/* ── Greeting ── */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">
          {greeting.text}{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: t.bookAppt, href: "/appointments", gradient: "from-primary-600 to-primary-500" },
          { icon: Video, label: t.startVideo, href: "/doctors", gradient: "from-accent-500 to-accent-400" },
          { icon: Newspaper, label: t.browseBlogs, href: "#posts", gradient: "from-gold-400 to-gold-500" },
          { icon: Bookmark, label: t.savedDoctors, href: "/saved-doctors", gradient: "from-primary-500 to-accent-500" },
        ].map(({ icon: Icon, label, href, gradient }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-600 text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Recommended Doctors ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <h2 className="font-display font-semibold text-slate-800">{t.recommended}</h2>
          </div>
          <Link href="/doctors" className="flex items-center gap-1 text-sm text-primary-600 hover:underline font-medium">
            {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          {featuredDoctors.map((doc) => (
            <div key={doc.id} className="flex-none w-[28%] min-w-[100px] snap-start md:w-auto md:flex-auto">
              <DoctorCard {...doc} compact />
            </div>
          ))}
        </div>
      </section>

      {/* ── Saved Doctors ── */}
      {savedDoctorsData.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-rose-400 fill-rose-400" />
              <h2 className="font-display font-semibold text-slate-800">Saved Doctors</h2>
            </div>
            <Link href="/saved-doctors" className="flex items-center gap-1 text-sm text-primary-600 hover:underline font-medium">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-6 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
            {savedDoctorsData.map((doc) => (
              <div key={doc.id} className="flex-none w-[28%] min-w-[100px] snap-start md:w-auto md:flex-auto">
                <DoctorCard {...doc} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Health Feed with Search ── */}
      <section id="posts">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold text-slate-800">{t.latestPosts}</h2>
          {/* Blog search */}
          <div className="relative w-full sm:w-72" data-search="blog">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={blogSearch}
              onChange={(e) => setBlogSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400 transition-colors placeholder:text-slate-400 text-slate-700"
            />
            {blogSearch && (
              <button
                onClick={() => setBlogSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {blogSearch && filteredPosts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {t.noResults} &ldquo;{blogSearch}&rdquo;
            </p>
            <button
              onClick={() => setBlogSearch("")}
              className="mt-3 text-xs text-primary-600 hover:underline font-medium"
            >
              {t.clearSearch}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} {...post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
