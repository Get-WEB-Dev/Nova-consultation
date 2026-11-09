"use client";

import { useState } from "react";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import Link from "next/link";
import { Search, Eye, EyeOff, Trash2, ExternalLink, AlertCircle, Heart, MessageCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface PostRow {
    id: string; title: string; slug: string; isPublished: boolean; views: number;
    likes: number; comments: number; createdAt: string; author: string;
}

export default function AdminPostsPage() {
    const toast = useToast();
    const [onlyHidden, setOnlyHidden] = useState(false);
    const [deletePost, setDeletePost] = useState<PostRow | null>(null);
    const [busy, setBusy] = useState(false);
    const { rows: posts, total, loading, error, q: query, setQ: setQuery, page, setPage, pageSize, reload: load } =
        useServerList<PostRow>("/api/admin/posts", onlyHidden ? { status: "hidden" } : {});

    const togglePublished = async (p: PostRow) => {
        try {
            await adminFetch("/api/admin/posts", {
                method: "PATCH",
                body: JSON.stringify({ postId: p.id, isPublished: !p.isPublished }),
            });
            toast("success", p.isPublished ? "Post hidden from the blog" : "Post is live again");
            await load();
        } catch (e: any) {
            toast("error", e.message);
        }
    };

    const confirmDelete = async () => {
        if (!deletePost) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/posts", { method: "DELETE", body: JSON.stringify({ postId: deletePost.id }) });
            toast("success", "Post deleted");
            setDeletePost(null);
            await load();
        } catch (e: any) {
            toast("error", e.message);
            setDeletePost(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Blog Posts" subtitle="Review and moderate what doctors publish" />

            <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or author…" className="input-field pl-10" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} /> Hidden only
                </label>
            </div>

            {loading && posts.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : posts.length === 0 ? (
                <EmptyState text="No posts found" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {posts.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">{p.title}</p>
                                <p className="text-xs text-slate-400 truncate">
                                    {p.author} · {timeAgo(p.createdAt)} · {p.views} views
                                </p>
                                <p className="text-[11px] text-slate-300 flex items-center gap-3 mt-0.5">
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {p.likes}</span>
                                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {p.comments}</span>
                                </p>
                            </div>
                            <span className={`badge ${p.isPublished ? "badge-green" : "badge-slate"}`}>{p.isPublished ? "Live" : "Hidden"}</span>
                            <div className="flex items-center gap-1">
                                <Link href={`/posts/${p.slug}`} target="_blank" className="p-2 rounded-lg text-slate-300 hover:text-primary-600 hover:bg-primary-50" title="Open post">
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                                <button onClick={() => togglePublished(p)} className="p-2 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-50" title={p.isPublished ? "Hide" : "Publish"}>
                                    {p.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setDeletePost(p)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />
            <ConfirmDialog
                open={!!deletePost}
                danger
                loading={busy}
                title="Delete this post?"
                message={`"${deletePost?.title ?? ""}" and its comments will be permanently removed. Consider hiding it instead.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeletePost(null)}
            />
        </div>
    );
}