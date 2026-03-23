"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Search,
  X,
  BookOpen,
  Clock,
  ChevronRight,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

// ── Palette (matches landing page) ───────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

const CATEGORIES = [
  "All",
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "General",
  "Wellness",
];

const BLOGS = [
  {
    title: "10 Daily Habits for a Healthier Heart",
    category: "Cardiology",
    image:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800",
    date: "Mar 12, 2026",
    readTime: "5 min read",
    excerpt:
      "Simple lifestyle changes that can significantly reduce your risk of cardiovascular disease.",
    featured: true,
  },
  {
    title: "Understanding Mental Health and Brain Functions",
    category: "Neurology",
    image:
      "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&q=80&w=800",
    date: "Mar 15, 2026",
    readTime: "7 min read",
    excerpt:
      "How modern neuroscience is shedding light on mental health and cognitive wellness.",
  },
  {
    title: "Skincare Basics: Protecting Your Complexion",
    category: "Dermatology",
    image:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    date: "Mar 18, 2026",
    readTime: "4 min read",
    excerpt:
      "Expert dermatologist advice on building the perfect skincare routine for every skin type.",
  },
  {
    title: "Preventing Common Joint Injuries in Sports",
    category: "Orthopedics",
    image:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800",
    date: "Mar 20, 2026",
    readTime: "6 min read",
    excerpt:
      "Learn how to protect your joints and stay active with guidance from orthopedic specialists.",
  },
  {
    title: "Essential Vaccinations for Your Child",
    category: "Pediatrics",
    image:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=800",
    date: "Mar 22, 2026",
    readTime: "5 min read",
    excerpt:
      "A parent's guide to understanding the importance and schedule of childhood vaccinations.",
  },
  {
    title: "The Importance of Annual Physical Exams",
    category: "General",
    image:
      "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=800",
    date: "Mar 25, 2026",
    readTime: "4 min read",
    excerpt:
      "Why regular health check-ups are the cornerstone of preventive medicine.",
  },
  {
    title: "Yoga and Meditation for Stress Relief",
    category: "Wellness",
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
    date: "Mar 28, 2026",
    readTime: "6 min read",
    excerpt:
      "Discover how mindfulness practices can transform your physical and mental health.",
  },
  {
    title: "Nutrition Guide: Eating for a Stronger Immune System",
    category: "General",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800",
    date: "Mar 30, 2026",
    readTime: "8 min read",
    excerpt:
      "Foods, vitamins, and dietary habits that help boost your body's natural defenses.",
  },
];

export default function BlogsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = BLOGS.filter((b) => {
    const matchesCat =
      activeCategory === "All" || b.category === activeCategory;
    const matchesQ =
      !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQ;
  });

  const featured = filtered.find((b) => b.featured) || filtered[0];
  const rest = filtered.filter((b) => b !== featured);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#eef2f7" }}
    >
      <ModernNavbar />
      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div style={{ background: NAV_BG }} className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 text-[12px] font-semibold mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span style={{ color: SKY }}>Blog</span>
          </div>

          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-5 border"
              style={{
                background: "rgba(56,189,248,0.12)",
                borderColor: "rgba(56,189,248,0.3)",
                color: SKY,
              }}
            >
              <BookOpen className="w-3.5 h-3.5" /> Health Insights
            </div>
            <h1
              className="font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Expert Health Blog
            </h1>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Stay informed with the latest medical insights, health tips, and
              wellness advice from our verified specialists.
            </p>
          </div>

          {/* Search bar — matching landing page style */}
          <div className="mt-8 max-w-xl">
            <div
              className="flex items-center bg-white rounded-xl overflow-hidden border-2"
              style={{
                borderColor: SKY,
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            >
              <div className="flex items-center gap-2.5 flex-1 px-4 py-3.5">
                <Search
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: ACCENT }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, categories…"
                  className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400"
                  style={{ color: "#1e293b" }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                  </button>
                )}
              </div>
              <button
                className="px-5 py-3.5 text-[13px] font-extrabold text-white flex-shrink-0"
                style={{ background: NAV_DARK }}
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Category filter strip */}
        <div
          className="border-t"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: NAV_DARK,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div
              className="flex items-center gap-2 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex-shrink-0 text-[12px] font-bold px-4 py-2 rounded-full border transition-all whitespace-nowrap"
                  style={
                    activeCategory === cat
                      ? { background: SKY, color: NAV_DARK, borderColor: SKY }
                      : {
                          background: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.7)",
                          borderColor: "rgba(255,255,255,0.12)",
                        }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {filtered.length === 0 ? (
          <div
            className="bg-white border border-slate-200 rounded-2xl py-20 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-lg mb-1">
              No articles found
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Try adjusting your search or category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="text-sm font-bold underline underline-offset-2"
              style={{ color: ACCENT }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured article — big card */}
            {featured && (
              <div
                className="mb-8 bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all group cursor-pointer lg:flex"
                style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}
              >
                <div className="relative lg:w-[52%] flex-shrink-0 h-56 sm:h-72 lg:h-auto overflow-hidden bg-slate-100">
                  <Image
                    src={featured.image}
                    alt={featured.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-extrabold text-white"
                    style={{ background: ACCENT }}
                  >
                    {featured.category}
                  </div>
                  <div
                    className="absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                  >
                    Featured
                  </div>
                </div>
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      {featured.date}
                    </span>
                    <span className="text-slate-200">·</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <Clock className="w-3 h-3" /> {featured.readTime}
                    </span>
                  </div>
                  <h2
                    className="font-extrabold text-slate-900 leading-snug mb-3 group-hover:text-blue-700 transition-colors"
                    style={{ fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)" }}
                  >
                    {featured.title}
                  </h2>
                  <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 text-[13px] font-extrabold group-hover:gap-3 transition-all"
                    style={{ color: ACCENT }}
                  >
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((blog, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col"
                    style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 overflow-hidden bg-slate-100 flex-shrink-0">
                      <Image
                        src={blog.image}
                        alt={blog.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white"
                        style={{ background: ACCENT }}
                      >
                        {blog.category}
                      </div>
                    </div>
                    {/* Body */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {blog.date}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Clock className="w-2.5 h-2.5" /> {blog.readTime}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-[14px] sm:text-[15px] text-slate-900 leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-[12px] text-slate-500 leading-relaxed flex-1 mb-4">
                        {blog.excerpt}
                      </p>
                      <div className="border-t border-dashed border-slate-100 pt-3 mt-auto">
                        <span
                          className="inline-flex items-center gap-1.5 text-[12px] font-extrabold group-hover:gap-2.5 transition-all"
                          style={{ color: ACCENT }}
                        >
                          Read Article <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <ModernFooter />
    </div>
  );
}
