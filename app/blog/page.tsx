"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import {
    Search, X, BookOpen, Clock, ChevronRight, Heart, MessageCircle,
    Bookmark, Share2, Send, Reply, ChevronDown, MoreHorizontal,
    ThumbsUp, Eye, Play, Loader2,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

const NAV_BG = "#1a3558";
const NAV_DARK = "#0c192c";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

const CATEGORIES = ["All", "Cardiology", "Neurology", "Dermatology", "Orthopedics", "Pediatrics", "General", "Wellness", "Mental Health", "Nutrition"];

interface Comment {
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
    likes: number;
    liked: boolean;
    replies: Comment[];
}

interface Post {
    id: string;
    doctorName: string;
    doctorSpecialty: string;
    doctorAvatar?: string | null;
    title: string;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    thumbnailUrl?: string | null;
    likes: number;
    views: number;
    commentCount: number;
    comments: Comment[];
    tags: string[];
    createdAt: string;
    liked: boolean;
    saved: boolean;
    readTime?: string;
}

function ago(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function CommentItem({ comment, onLike, onReply, depth = 0 }: {
    comment: Comment; onLike: (id: string) => void; onReply: (id: string, text: string) => void; depth?: number;
}) {
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);

    return (
        <div className={`${depth > 0 ? "ml-8 border-l-2 border-slate-100 pl-4" : ""}`}>
            <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0"
                    style={{ background: depth > 0 ? ACCENT : NAV_BG }}>{comment.authorName[0]}</div>
                <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                        <p className="text-[12px] font-bold text-slate-800">{comment.authorName}</p>
                        <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">{comment.text}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 px-1">
                        <span className="text-[10px] text-slate-400">{ago(comment.createdAt)}</span>
                        <button onClick={() => onLike(comment.id)}
                            className={`flex items-center gap-1 text-[11px] font-semibold ${comment.liked ? "text-rose-500" : "text-slate-400 hover:text-rose-400"}`}>
                            <Heart className={`w-3 h-3 ${comment.liked ? "fill-rose-500" : ""}`} />
                            {comment.likes > 0 && comment.likes}
                        </button>
                        {depth === 0 && (
                            <button onClick={() => setShowReplyInput(!showReplyInput)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-500">
                                <Reply className="w-3 h-3" /> Reply
                            </button>
                        )}
                        {comment.replies?.length > 0 && (
                            <button onClick={() => setShowReplies(!showReplies)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-blue-500">
                                <ChevronDown className={`w-3 h-3 transition-transform ${showReplies ? "rotate-180" : ""}`} />
                                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                            </button>
                        )}
                    </div>
                    {showReplyInput && (
                        <div className="flex gap-2 mt-2">
                            <input type="text" placeholder="Write a reply…" value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && replyText.trim()) {
                                        onReply(comment.id, replyText.trim()); setReplyText(""); setShowReplyInput(false);
                                    }
                                }}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 transition-colors" />
                            <button onClick={() => {
                                if (replyText.trim()) { onReply(comment.id, replyText.trim()); setReplyText(""); setShowReplyInput(false); }
                            }} className="p-2 rounded-xl text-white" style={{ background: ACCENT }}>
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {showReplies && comment.replies?.map((r) => (
                        <CommentItem key={r.id} comment={r} onLike={onLike} onReply={onReply} depth={depth + 1} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function FeedPostCard({ post, onUpdate }: { post: Post; onUpdate: (p: Post) => void }) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [saved, setSaved] = useState(post.saved);
    const long = post.content.length > 250;

    const handleLike = () => onUpdate({ ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 });
    const handleSave = () => { setSaved(!saved); onUpdate({ ...post, saved: !saved }); };

    const handleComment = () => {
        if (!commentText.trim()) return;
        const newComment: Comment = {
            id: `temp-${Date.now()}`, authorName: "You", text: commentText.trim(),
            createdAt: new Date().toISOString(), likes: 0, liked: false, replies: [],
        };
        onUpdate({ ...post, comments: [...post.comments, newComment], commentCount: post.commentCount + 1 });
        setCommentText("");
    };

    const handleCommentLike = (id: string) => {
        const toggleLike = (comments: Comment[]): Comment[] =>
            comments.map((c) => c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
                : { ...c, replies: toggleLike(c.replies) });
        onUpdate({ ...post, comments: toggleLike(post.comments) });
    };

    const handleReply = (commentId: string, text: string) => {
        const addReply = (comments: Comment[]): Comment[] =>
            comments.map((c) => c.id === commentId ? {
                ...c, replies: [...c.replies, {
                    id: `temp-r-${Date.now()}`, authorName: "You", text,
                    createdAt: new Date().toISOString(), likes: 0, liked: false, replies: [],
                }]
            } : { ...c, replies: addReply(c.replies) });
        onUpdate({ ...post, comments: addReply(post.comments) });
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: post.title, text: post.content.slice(0, 100), url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            {/* Author */}
            <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
                    style={{ background: NAV_BG }}>
                    {post.doctorAvatar ? (
                        <Image src={post.doctorAvatar} alt={post.doctorName} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    ) : post.doctorName[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-[14px]">{post.doctorName}</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold" style={{ color: ACCENT }}>{post.doctorSpecialty}</p>
                        <span className="text-slate-300">·</span>
                        <p className="text-[11px] text-slate-400">{ago(post.createdAt)}</p>
                    </div>
                </div>
                <button className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Media — thumbnail with play for video, image for photo */}
            {post.videoUrl && (
                <div className="relative overflow-hidden bg-black" style={{ maxHeight: 400 }}>
                    {post.thumbnailUrl ? (
                        <div className="relative cursor-pointer group" onClick={() => {
                            const el = document.getElementById(`video-${post.id}`);
                            if (el) { (el as HTMLVideoElement).play(); el.parentElement!.querySelector('.thumb-overlay')?.remove(); }
                        }}>
                            <img src={post.thumbnailUrl} alt={post.title} className="w-full object-cover" style={{ maxHeight: 400 }} />
                            <div className="thumb-overlay absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                                    <Play className="w-7 h-7 text-slate-800 ml-1" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <video id={`video-${post.id}`} src={post.videoUrl} controls className="w-full" style={{ maxHeight: 400 }} />
                    )}
                    <video id={`video-${post.id}`} src={post.videoUrl} controls className={`w-full ${post.thumbnailUrl ? 'hidden' : ''}`} style={{ maxHeight: 400 }} />
                </div>
            )}
            {post.imageUrl && !post.videoUrl && (
                <div className="overflow-hidden bg-slate-100" style={{ maxHeight: 400 }}>
                    <img src={post.imageUrl} alt={post.title} className="w-full object-cover" />
                </div>
            )}

            {/* Content */}
            <div className="px-4 pb-2 pt-3">
                <p className="font-extrabold text-slate-900 text-[15px] mb-2 leading-tight">{post.title}</p>
                <p className={`text-slate-600 text-[13px] leading-relaxed whitespace-pre-line ${!expanded && long ? "line-clamp-4" : ""}`}>
                    {post.content}
                </p>
                {long && (
                    <button onClick={() => setExpanded(!expanded)}
                        className="text-[12px] font-semibold mt-1 hover:underline" style={{ color: ACCENT }}>
                        {expanded ? "Show less" : "Read more"}
                    </button>
                )}
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.tags.map((t) => (
                            <span key={t} className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "#eff6ff", color: ACCENT }}>#{t}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes} likes</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views} views</span>
                </div>
                <button onClick={() => setShowComments(!showComments)} className="hover:underline">
                    {post.commentCount} comments
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center border-t border-slate-100 px-2 py-1">
                <button onClick={handleLike}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${post.liked ? "text-rose-500" : "text-slate-500 hover:bg-slate-50 hover:text-rose-400"}`}>
                    <Heart className={`w-4 h-4 ${post.liked ? "fill-rose-500" : ""}`} /> {post.liked ? "Liked" : "Like"}
                </button>
                <button onClick={() => setShowComments(!showComments)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                    <MessageCircle className="w-4 h-4" /> Comment
                </button>
                <button onClick={handleSave}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${saved ? "text-amber-500" : "text-slate-500 hover:bg-slate-50"}`}>
                    <Bookmark className={`w-4 h-4 ${saved ? "fill-amber-400" : ""}`} /> {saved ? "Saved" : "Save"}
                </button>
                <button onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                    <Share2 className="w-4 h-4" /> Share
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                    <div className="flex gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0"
                            style={{ background: SKY }}>U</div>
                        <div className="flex-1 flex gap-2">
                            <input type="text" placeholder="Write a comment…" value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 transition-colors bg-slate-50" />
                            <button onClick={handleComment} disabled={!commentText.trim()}
                                className="p-2 rounded-xl text-white disabled:opacity-50 transition-all" style={{ background: ACCENT }}>
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {post.comments.length === 0 ? (
                            <p className="text-[12px] text-slate-400 text-center py-3">No comments yet. Be the first to comment.</p>
                        ) : post.comments.map((c) => (
                            <CommentItem key={c.id} comment={c} onLike={handleCommentLike} onReply={handleReply} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BlogsPage() {
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewTab, setViewTab] = useState<"latest" | "trending" | "saved">("latest");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/posts");
                if (res.ok) {
                    const j = await res.json();
                    if (j.data?.length) {
                        setPosts(j.data.map((p: any) => ({
                            id: p.id,
                            doctorName: p.doctorName || "Dr. Specialist",
                            doctorSpecialty: p.doctorSpecialty || "Doctor",
                            doctorAvatar: p.doctorAvatar || null,
                            title: p.title,
                            content: p.content,
                            imageUrl: p.imageUrl || null,
                            videoUrl: p.videoUrl || null,
                            thumbnailUrl: p.thumbnailUrl || null,
                            likes: p.likes || 0,
                            views: p.views || 0,
                            commentCount: p.commentCount || p.comments?.length || 0,
                            comments: p.comments || [],
                            tags: p.tags || [],
                            createdAt: p.createdAt || p.created_at || new Date().toISOString(),
                            liked: p.liked || false,
                            saved: p.saved || false,
                            readTime: p.readTime || `${Math.max(2, Math.ceil((p.content?.length || 200) / 1000))} min read`,
                        })));
                    }
                }
            } catch { }
            setLoading(false);
        };
        load();
    }, []);

    const filtered = posts.filter((p) => {
        const matchCat = activeCategory === "All" || p.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase());
        const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchTab = viewTab === "latest" ? true : viewTab === "trending" ? true : viewTab === "saved" ? p.saved : true;
        return matchCat && matchSearch && matchTab;
    }).sort((a, b) => {
        if (viewTab === "trending") return b.likes - a.likes;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const handleUpdate = (post: Post) => {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: "#eef2f7" }}>
            <ModernNavbar />
            {/* ── HERO BANNER ──── */}
            <div style={{ background: NAV_BG }} className="pt-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex items-center gap-2 text-[12px] font-semibold mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span style={{ color: SKY }}>Blog & Feed</span>
                    </div>
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-5 border"
                            style={{ background: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.3)", color: SKY }}>
                            <BookOpen className="w-3.5 h-3.5" /> Health Insights & Community
                        </div>
                        <h1 className="font-extrabold text-white leading-tight mb-4" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
                            Expert Health Feed
                        </h1>
                        <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                            Stay informed with the latest medical insights, health tips, and wellness advice from our verified specialists.
                        </p>
                    </div>
                    <div className="mt-8 max-w-xl">
                        <div className="flex items-center bg-white rounded-xl overflow-hidden border-2"
                            style={{ borderColor: SKY, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                            <div className="flex items-center gap-2.5 flex-1 px-4 py-3.5">
                                <Search className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search articles, topics…"
                                    className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400" style={{ color: "#1e293b" }} />
                                {searchQuery && <button onClick={() => setSearchQuery("")}><X className="w-4 h-4 text-slate-300 hover:text-slate-500" /></button>}
                            </div>
                            <button className="px-5 py-3.5 text-[13px] font-extrabold text-white flex-shrink-0" style={{ background: NAV_DARK }}>Search</button>
                        </div>
                    </div>
                </div>
                <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: NAV_DARK }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                            {CATEGORIES.map((cat) => (
                                <button key={cat} onClick={() => setActiveCategory(cat)}
                                    className="flex-shrink-0 text-[12px] font-bold px-4 py-2 rounded-full border transition-all whitespace-nowrap"
                                    style={activeCategory === cat
                                        ? { background: SKY, color: NAV_DARK, borderColor: SKY }
                                        : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.12)" }}>
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MAIN CONTENT ──── */}
            <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
                {/* View Tabs */}
                <div className="flex border-b border-slate-200 mb-6">
                    {[
                        { id: "latest", label: "Latest" },
                        { id: "trending", label: "Trending" },
                        { id: "saved", label: "Saved" },
                    ].map((tab) => (
                        <button key={tab.id} onClick={() => setViewTab(tab.id as any)}
                            className={`px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${viewTab === tab.id
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-bold text-slate-700 text-lg mb-1">No posts found</p>
                        <p className="text-slate-400 text-sm mb-4">Try adjusting your search or category.</p>
                        <button onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                            className="text-sm font-bold underline underline-offset-2" style={{ color: ACCENT }}>Clear filters</button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filtered.map((post) => (
                            <FeedPostCard key={post.id} post={post} onUpdate={handleUpdate} />
                        ))}
                    </div>
                )}
            </main>
            <ModernFooter />
        </div>
    );
}
