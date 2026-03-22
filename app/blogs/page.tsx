"use client";
import ModernNavbar from "@/components/ui/ModernNavbar";
import ModernFooter from "@/components/ui/ModernFooter";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["All", "Cardiology", "Neurology", "Dermatology", "Orthopedics", "Pediatrics", "General", "Wellness"];

const BLOGS = [
    {
        title: "10 Daily Habits for a Healthier Heart",
        category: "Cardiology",
        image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=600",
        date: "Mar 12, 2026",
        excerpt: "Simple lifestyle changes that can significantly reduce your risk of cardiovascular disease."
    },
    {
        title: "Understanding Mental Health and Brain Functions",
        category: "Neurology",
        image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&q=80&w=600",
        date: "Mar 15, 2026",
        excerpt: "How modern neuroscience is shedding light on mental health and cognitive wellness."
    },
    {
        title: "Skincare Basics: Protecting Your Complexion",
        category: "Dermatology",
        image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=600",
        date: "Mar 18, 2026",
        excerpt: "Expert dermatologist advice on building the perfect skincare routine for every skin type."
    },
    {
        title: "Preventing Common Joint Injuries in Sports",
        category: "Orthopedics",
        image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=600",
        date: "Mar 20, 2026",
        excerpt: "Learn how to protect your joints and stay active with guidance from orthopedic specialists."
    },
    {
        title: "Essential Vaccinations for Your Child",
        category: "Pediatrics",
        image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80&w=600",
        date: "Mar 22, 2026",
        excerpt: "A parent's guide to understanding the importance and schedule of childhood vaccinations."
    },
    {
        title: "The Importance of Annual Physical Exams",
        category: "General",
        image: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&q=80&w=600",
        date: "Mar 25, 2026",
        excerpt: "Why regular health check-ups are the cornerstone of preventive medicine and long-term wellness."
    },
    {
        title: "Yoga and Meditation for Stress Relief",
        category: "Wellness",
        image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600",
        date: "Mar 28, 2026",
        excerpt: "Discover how mindfulness practices can transform your physical and mental health."
    },
    {
        title: "Nutrition Guide: Eating for a Stronger Immune System",
        category: "General",
        image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=600",
        date: "Mar 30, 2026",
        excerpt: "Foods, vitamins, and dietary habits that help boost your body's natural defenses."
    },
];

export default function BlogsPage() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = BLOGS.filter(b => {
        const matchesCat = activeCategory === "All" || b.category === activeCategory;
        const matchesQ = !searchQuery || b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesQ;
    });

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
            <ModernNavbar />

            <main className="flex-1 pt-32 pb-24 max-w-[90rem] mx-auto px-6 md:px-12 w-full">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-600 font-bold text-sm mb-6 border border-teal-100">
                        Health Insights
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight mb-4">
                        Expert <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">Health Blog</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium">Stay informed with the latest medical insights, health tips, and wellness advice from our specialists.</p>
                </div>

                {/* Search */}
                <div className="max-w-xl mx-auto mb-10 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search articles…"
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all text-base font-medium placeholder-slate-400"
                    />
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border shadow-sm ${activeCategory === cat
                                    ? "bg-slate-800 text-white border-slate-800 scale-105"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Blog Grid */}
                {filtered.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map((blog, idx) => (
                            <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col">
                                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                                    <Image src={blog.image} alt={blog.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                        {blog.category}
                                    </div>
                                </div>
                                <div className="p-7 flex flex-col flex-1">
                                    <p className="text-sm font-bold text-slate-400 mb-2 tracking-wide uppercase">{blog.date}</p>
                                    <h3 className="text-xl font-bold text-slate-800 mb-3 leading-snug group-hover:text-primary-600 transition-colors">{blog.title}</h3>
                                    <p className="text-slate-500 text-sm mb-6 leading-relaxed flex-1">{blog.excerpt}</p>
                                    <div className="mt-auto inline-flex items-center gap-2 text-primary-600 font-bold text-sm group-hover:gap-3 transition-all pt-4 border-t border-slate-50">
                                        Read Article <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-xl font-bold text-slate-700">No articles found</p>
                        <p className="text-slate-500 mt-2">Try adjusting your search or category filter.</p>
                    </div>
                )}
            </main>

            <ModernFooter />
        </div>
    );
}
