"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp, Play, Eye } from "lucide-react";

interface Comment {
  id: string;
  author: string;
  text: string;
  avatar: string;
}

export interface PostCardProps {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
  date: string;
  title: string;
  content: string;
  image?: string | null;
  video?: string | null;
  thumbnail?: string | null;
  likes: number;
  comments: number;
  tags: string[];
  standalone?: boolean;
}

const MOCK_COMMENTS: Record<string, Comment[]> = {
  p1: [
    { id: "c1", author: "Selam T.", avatar: "https://ui-avatars.com/api/?name=Selam+T&background=eef4fa&color=1B3A5C&size=40", text: "This is so helpful! I've been trying to walk every morning." },
    { id: "c2", author: "John M.", avatar: "https://ui-avatars.com/api/?name=John+M&background=fdf7e8&color=E9A825&size=40", text: "Thank you Dr. Johnson, great tips as always." },
  ],
  p2: [
    { id: "c3", author: "Tigist A.", avatar: "https://ui-avatars.com/api/?name=Tigist+A&background=edf7ef&color=2E8B3D&size=40", text: "Very important reminder. Malaria is a big concern in our area." },
  ],
  p3: [
    { id: "c4", author: "Meron B.", avatar: "https://ui-avatars.com/api/?name=Meron+B&background=fdf7e8&color=E9A825&size=40", text: "I never knew sunscreen matters even on cloudy days!" },
    { id: "c5", author: "Alex K.", avatar: "https://ui-avatars.com/api/?name=Alex+K&background=eef4fa&color=1B3A5C&size=40", text: "SPF 30+ every day now, thanks doc!" },
  ],
  p4: [
    { id: "c7", author: "Samuel W.", avatar: "https://ui-avatars.com/api/?name=Samuel+W&background=eef4fa&color=1B3A5C&size=40", text: "I had a sudden severe headache last month, went straight to the ER. Glad I did!" },
  ],
  p5: [
    { id: "c8", author: "Liya G.", avatar: "https://ui-avatars.com/api/?name=Liya+G&background=fdf7e8&color=E9A825&size=40", text: "This was incredibly educational. Thank you Dr. Johnson!" },
    { id: "c9", author: "Yonas B.", avatar: "https://ui-avatars.com/api/?name=Yonas+B&background=edf7ef&color=2E8B3D&size=40", text: "Finally a clear explanation of ECG for non-doctors." },
    { id: "c10", author: "Hana M.", avatar: "https://ui-avatars.com/api/?name=Hana+M&background=eef4fa&color=1B3A5C&size=40", text: "Can you do one on blood pressure readings next?" },
  ],
};

const THUMBNAIL_GRADIENTS: Record<string, string> = {
  p1: "from-primary-600 to-accent-500",
  p2: "from-accent-500 to-primary-600",
  p3: "from-gold-400 to-gold-500",
  p4: "from-primary-500 to-primary-700",
  p5: "from-accent-400 to-gold-400",
};

export default function PostCard(props: PostCardProps) {
  const {
    id, doctorId, doctorName, doctorAvatar, doctorSpecialty,
    date, title, content, image, video, thumbnail, likes, comments, tags,
    standalone = false,
  } = props;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentList, setCommentList] = useState<Comment[]>(MOCK_COMMENTS[id] || []);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setCommentList((prev) => [...prev, {
      id: `c-${Date.now()}`,
      author: "You",
      avatar: "https://ui-avatars.com/api/?name=You&background=1B3A5C&color=fff&size=40",
      text: newComment.trim(),
    }]);
    setNewComment("");
  };

  const gradientClass = THUMBNAIL_GRADIENTS[id] || "from-primary-600 to-accent-500";
  const thumbSrc = thumbnail || image;
  const hasVideo = !!video;

  const ThumbnailSection = () => (
    <div className="relative w-full bg-slate-100 rounded-t-2xl overflow-hidden group/thumb" style={{ aspectRatio: "16/9" }}>
      {thumbSrc ? (
        <>
          <Image src={thumbSrc} alt={title} fill className="object-cover transition-transform duration-300 group-hover/thumb:scale-105" unoptimized />
          {hasVideo && !standalone && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                <Play className="w-6 h-6 text-primary-800 ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
          {!standalone && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          )}
          {!standalone && (
            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="text-white font-bold text-sm leading-snug drop-shadow line-clamp-2">{title}</h4>
            </div>
          )}
          {hasVideo && !standalone && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
              3:24
            </div>
          )}
        </>
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-end p-4`}>
          <div className="flex flex-col gap-2 w-full">
            {hasVideo && !standalone && (
              <div className="flex">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow">
                  <Play className="w-5 h-5 text-primary-800 ml-0.5" fill="currentColor" />
                </div>
              </div>
            )}
            {!standalone && (
              <h4 className="text-white font-bold text-sm leading-snug drop-shadow line-clamp-2">{title}</h4>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const InteractionsSection = () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-all ${liked ? "text-rose-500 scale-105" : "text-slate-400 hover:text-rose-500"}`}
        >
          <Heart className={`w-4 h-4 transition-all ${liked ? "fill-rose-500 scale-110" : ""}`} />
          <span className="font-medium">{likeCount}</span>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowComments(!showComments); }}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="font-medium">{commentList.length}</span>
          {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="flex items-center gap-1 text-sm text-slate-400 ml-auto">
          <Eye className="w-3.5 h-3.5" />
          <span className="font-medium text-xs">{Math.floor(likes * 2.5)}</span>
        </span>
      </div>

      {showComments && (
        <div className="flex flex-col gap-3 animate-fade-up">
          {commentList.length > 0 && (
            <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1">
              {commentList.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={comment.avatar} alt={comment.author} fill className="object-cover" unoptimized />
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{comment.author}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-600">Y</span>
            </div>
            <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200 focus-within:border-primary-400 transition-colors">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              />
              <button onClick={handleAddComment} disabled={!newComment.trim()} className="text-primary-600 disabled:text-slate-300 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const cardContent = (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 group">
      <ThumbnailSection />
      <div className="p-4 flex flex-col gap-3">
        <Link
          href={`/doctor/${doctorId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2.5 group/doc w-fit"
        >
          <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary-100 group-hover/doc:ring-primary-300 transition-all">
            <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 group-hover/doc:text-primary-600 transition-colors leading-tight">
              {doctorName}
            </p>
            <p className="text-xs text-slate-500">
              {doctorSpecialty} · {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </Link>

        {standalone && (
          <h2 className="font-display font-bold text-xl text-slate-800 leading-snug">{title}</h2>
        )}

        <p className={`text-sm text-slate-600 leading-relaxed ${standalone ? "" : "line-clamp-2"}`}>
          {content}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium border border-primary-100">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <InteractionsSection />
      </div>
    </div>
  );

  if (standalone) return cardContent;

  return (
    <Link href={`/posts/${id}`} className="block hover:opacity-95 transition-opacity">
      {cardContent}
    </Link>
  );
}
