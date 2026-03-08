"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PostCard from "@/components/ui/PostCard";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CalendarPlus, Share2 } from "lucide-react";
import type { Post } from "@/lib/types";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((data) => {
        const all = data.data || data;
        const found = all.find((p: Post) => p.id === params.id);
        setPost(found || null);
        setRelatedPosts(all.filter((p: Post) => p.id !== params.id).slice(0, 3));
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
          <div className="bg-white rounded-2xl p-6 animate-shimmer h-96" />
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-slate-500">Post not found</p>
          <Link href="/dashboard" className="btn-primary mt-4">Back to Dashboard</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="space-y-6 animate-fade-up">
          {/* Back */}
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Main post */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Video player or post card */}
              {post.video ? (
                <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                  <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
                    <video
                      src={post.video}
                      poster={post.thumbnail || undefined}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-5">
                    <PostCard {...post} standalone />
                  </div>
                </div>
              ) : (
                <PostCard {...post} standalone />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Doctor card */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image src={post.doctorAvatar} alt={post.doctorName} fill className="object-cover" unoptimized />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-slate-800">{post.doctorName}</p>
                    <p className="text-sm text-primary-600 font-medium">{post.doctorSpecialty}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/doctor/${post.doctorId}`} className="flex-1 btn-secondary text-xs py-2">
                    View Profile
                  </Link>
                  <Link href={`/doctor/${post.doctorId}`} className="flex-1 btn-primary text-xs py-2">
                    <CalendarPlus className="w-3.5 h-3.5" /> Book
                  </Link>
                </div>
              </div>

              {/* Related posts */}
              {relatedPosts.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold text-sm text-slate-800 mb-3">Related Posts</h3>
                  <div className="space-y-3">
                    {relatedPosts.map((rp) => (
                      <Link
                        key={rp.id}
                        href={`/posts/${rp.id}`}
                        className="flex gap-3 bg-white rounded-xl p-3 hover:shadow-sm transition-shadow border border-slate-100 group"
                      >
                        {rp.thumbnail ? (
                          <div className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={rp.thumbnail} alt={rp.title} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="w-28 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {rp.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">{rp.doctorName}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
