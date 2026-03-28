"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import {
  Heart,
  MessageCircle,
  Plus,
  X,
  Loader2,
  Bookmark,
  MoreHorizontal,
  Send,
  Share2,
  Edit3,
  Image as Img,
  Film,
  Trash2,
  Flag,
  Reply,
  ChevronDown,
  Tag,
  Sparkles,
  Globe,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  replies: Comment[];
  showReplies?: boolean;
}

interface Post {
  id: string;
  doctorId: string;
  authorUserId?: string;
  doctorName: string;
  doctorSpecialty: string;
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  likes: number;
  comments: Comment[];
  tags: string[];
  createdAt: string;
  liked: boolean;
  saved: boolean;
}

interface PendingPost {
  title: string;
  content: string;
  tags: string[];
  imageFile: File | null;
  videoFile: File | null;
  thumbnailFile: File | null;
}

const TAGS = [
  "all",
  "cardiology",
  "nutrition",
  "mental-health",
  "pediatrics",
  "prevention",
  "dermatology",
  "general",
  "tips",
  "research",
];

function ago(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const MOCK_POSTS: Post[] = [];

function CommentItem({
  comment,
  onLike,
  onReply,
  currentUserId,
  depth = 0,
}: {
  comment: Comment;
  onLike: (id: string) => void;
  onReply: (id: string, text: string) => void;
  currentUserId: string;
  depth?: number;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div
      className={`${depth > 0 ? "ml-8 border-l-2 border-slate-100 pl-4" : ""}`}
    >
      <div className="flex gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0"
          style={{ background: NAV_BG }}
        >
          {comment.authorName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-[12px] font-bold text-slate-800">
              {comment.authorName}
            </p>
            <p className="text-[13px] text-slate-600 mt-0.5 leading-relaxed">
              {comment.text}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1.5 px-1">
            <span className="text-[10px] text-slate-400">
              {ago(comment.createdAt)}
            </span>
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-[11px] font-semibold ${comment.liked ? "text-rose-500" : "text-slate-400 hover:text-rose-400"}`}
            >
              <Heart
                className={`w-3 h-3 ${comment.liked ? "fill-rose-500" : ""}`}
              />
              {comment.likes > 0 && comment.likes}
            </button>
            {depth === 0 && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-500"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}
            {comment.replies?.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-500"
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showReplies ? "rotate-180" : ""}`}
                />
                {comment.replies.length}{" "}
                {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && replyText.trim()) {
                    onReply(comment.id, replyText.trim());
                    setReplyText("");
                    setShowReplyInput(false);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={() => {
                  if (replyText.trim()) {
                    onReply(comment.id, replyText.trim());
                    setReplyText("");
                    setShowReplyInput(false);
                  }
                }}
                className="p-2 rounded-xl text-white"
                style={{ background: ACCENT }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {showReplies &&
            comment.replies?.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                onLike={onLike}
                onReply={onReply}
                currentUserId={currentUserId}
                depth={depth + 1}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  me,
  onUpdate,
}: {
  post: Post;
  me: AuthUser;
  onUpdate: (p: Post) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(post.saved);

  useEffect(() => {
    if (showComments && post.comments.length === 0) {
      setLoadingComments(true);
      fetch(`/api/posts/${post.id}/comments`)
        .then(res => res.json())
        .then(json => {
          if (json.data) {
            onUpdate({ ...post, comments: json.data });
          }
        })
        .finally(() => setLoadingComments(false));
    }
  }, [showComments, post.id]);
  const long = post.content.length > 250;
  const isOwn = post.doctorId === me.id;

  const handleLike = () =>
    onUpdate({
      ...post,
      liked: !post.liked,
      likes: post.liked ? post.likes - 1 : post.likes + 1,
    });

  const handleSave = async () => {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      await fetch(`/api/posts/${post.id}/bookmark`, {
        method: newSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: me.id }),
      });
    } catch {
      setSaved(saved);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");

    const newComment: Comment = {
      id: `temp-${Date.now()}`,
      authorId: me.id,
      authorName: `Dr. ${me.name}`,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
      replies: [],
    };
    onUpdate({ ...post, comments: [...post.comments, newComment] });

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: me.id, body: text })
      });
      if (!res.ok) throw new Error("Comment failed");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommentLike = (id: string) => {
    const toggleLike = (comments: Comment[]): Comment[] =>
      comments.map((c) =>
        c.id === id
          ? {
            ...c,
            liked: !c.liked,
            likes: c.liked ? c.likes - 1 : c.likes + 1,
          }
          : { ...c, replies: toggleLike(c.replies) },
      );
    onUpdate({ ...post, comments: toggleLike(post.comments) });
  };

  const handleReply = async (commentId: string, text: string) => {
    const addReply = (comments: Comment[]): Comment[] =>
      comments.map((c) =>
        c.id === commentId
          ? {
            ...c,
            replies: [
              ...c.replies,
              {
                id: `temp-r-${Date.now()}`,
                authorId: me.id,
                authorName: `Dr. ${me.name}`,
                text,
                createdAt: new Date().toISOString(),
                likes: 0,
                liked: false,
                replies: [],
              },
            ],
          }
          : { ...c, replies: addReply(c.replies) },
      );
    onUpdate({ ...post, comments: addReply(post.comments) });

    try {
      await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId: me.id, parentId: commentId, body: text })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
    >
      {/* Author */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: NAV_BG }}
        >
          {post.doctorName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-[14px]">
            {post.doctorName}
          </p>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold" style={{ color: ACCENT }}>
              {post.doctorSpecialty}
            </p>
            <span className="text-slate-300">·</span>
            <p className="text-[11px] text-slate-400">{ago(post.createdAt)}</p>
            <span className="text-slate-300">·</span>
            <Globe className="w-3 h-3 text-slate-300" />
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden">
                {isOwn ? (
                  <>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" /> Edit Post
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                      {saved ? "Unsave" : "Save"}
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                      <Flag className="w-3.5 h-3.5 text-slate-400" /> Report
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Media */}
      {post.imageUrl && (
        <div
          className="overflow-hidden bg-slate-100"
          style={{ maxHeight: 400 }}
        >
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full object-cover"
          />
        </div>
      )}
      {post.videoUrl && (
        <div className="overflow-hidden bg-black" style={{ maxHeight: 400 }}>
          <video
            src={post.videoUrl}
            controls
            className="w-full"
            style={{ maxHeight: 400 }}
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-2 pt-3">
        <p className="font-extrabold text-slate-900 text-[15px] mb-2 leading-tight">
          {post.title}
        </p>
        <p
          className={`text-slate-600 text-[13px] leading-relaxed whitespace-pre-line ${!expanded && long ? "line-clamp-4" : ""}`}
        >
          {post.content}
        </p>
        {long && (
          <button
            onClick={() => {
              if (!expanded) {
                fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => { });
              }
              setExpanded(!expanded);
            }}
            className="text-[12px] font-semibold mt-1 hover:underline"
            style={{ color: ACCENT }}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {post.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: "#eff6ff", color: ACCENT }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-slate-400">
        <button onClick={() => { }} className="hover:underline">
          {post.likes} likes
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="hover:underline"
        >
          {post.comments.length} comments
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t border-slate-100 px-2 py-1">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${post.liked ? "text-rose-500" : "text-slate-500 hover:bg-slate-50 hover:text-rose-400"}`}
        >
          <Heart className={`w-4 h-4 ${post.liked ? "fill-rose-500" : ""}`} />
          {post.liked ? "Liked" : "Like"}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition-all"
        >
          <MessageCircle className="w-4 h-4" /> Comment
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${saved ? "text-amber-500" : "text-slate-500 hover:bg-slate-50"}`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-amber-400" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {/* Comment input */}
          <div className="flex gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold flex-shrink-0"
              style={{ background: ACCENT }}
            >
              {me.name[0]}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 transition-colors bg-slate-50"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="p-2 rounded-xl text-white disabled:opacity-50 transition-all"
                style={{ background: ACCENT }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-3">
            {loadingComments ? (
              <div className="flex justify-center p-2"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
            ) : post.comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onLike={handleCommentLike}
                onReply={handleReply}
                currentUserId={me.id}
              />
            ))}
            {!loadingComments && post.comments.length === 0 && (
              <p className="text-[12px] text-slate-400 text-center py-3">
                No comments yet. Be the first to comment.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePostModal({
  me,
  onClose,
  onPost,
}: {
  me: AuthUser;
  onClose: () => void;
  onPost: (data: PendingPost) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setImageFile(file);
    setVideoPreview(null);
    setVideoFile(null);
    setThumbnailPreview(null);
    setThumbnailFile(null);
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be under 100MB");
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setVideoFile(file);
    setImagePreview(null);
    setImageFile(null);
  };

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Thumbnail must be under 5MB");
      return;
    }
    setThumbnailPreview(URL.createObjectURL(file));
    setThumbnailFile(file);
  };

  const handlePost = () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }
    onPost({
      title: title.trim(),
      content: content.trim(),
      tags,
      imageFile,
      videoFile,
      thumbnailFile,
    });
    onClose();
  };

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-3 top-[4%] bottom-[4%] z-50 bg-white rounded-2xl shadow-2xl flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: NAV_BG }}
          >
            {me.name[0]}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-[14px]">
              Dr. {me.name}
            </p>
            <p className="text-[11px] text-slate-400">Create a post</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <p className="text-[12px] text-rose-600">{error}</p>
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Post title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] font-bold outline-none focus:border-blue-400 transition-colors"
            />
          </div>

          <div>
            <textarea
              placeholder="Share your medical insights, tips, research, or cases…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Media preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img
                src={imagePreview}
                alt="preview"
                className="w-full max-h-48 object-cover"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  if (imgRef.current) imgRef.current.value = "";
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {videoPreview && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <video src={videoPreview} controls className="w-full max-h-48" />
                <button
                  onClick={() => {
                    setVideoPreview(null);
                    setVideoFile(null);
                    setThumbnailPreview(null);
                    setThumbnailFile(null);
                    if (vidRef.current) vidRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Thumbnail picker */}
              <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                <p className="text-[11px] font-bold text-slate-500 mb-2">📸 Video Thumbnail / Cover Image</p>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnail}
                />
                {thumbnailPreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={thumbnailPreview} alt="thumbnail" className="w-full max-h-28 object-cover" />
                    <button
                      onClick={() => {
                        setThumbnailPreview(null);
                        setThumbnailFile(null);
                        if (thumbRef.current) thumbRef.current.value = "";
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => thumbRef.current?.click()}
                    className="w-full py-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Img className="w-3.5 h-3.5 text-blue-400" />
                    Upload Cover Image
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.filter((t) => t !== "all").map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                  style={
                    tags.includes(tag)
                      ? {
                        background: ACCENT,
                        color: "white",
                        borderColor: ACCENT,
                      }
                      : {
                        background: "#f8fafc",
                        color: "#64748b",
                        borderColor: "#e2e8f0",
                      }
                  }
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0 bg-white">
          <div className="flex gap-2">
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImage}
            />
            <input
              ref={vidRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideo}
            />
            <button
              onClick={() => imgRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Img className="w-3.5 h-3.5 text-emerald-500" /> Photo
            </button>
            <button
              onClick={() => vidRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Film className="w-3.5 h-3.5 text-blue-500" /> Video
            </button>
          </div>
          <button
            onClick={handlePost}
            disabled={!title.trim() || !content.trim()}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white disabled:opacity-50 transition-all"
            style={{ background: NAV_BG }}
          >
            <Sparkles className="w-4 h-4" />
            Publish Post
          </button>
        </div>
      </div>
    </>
  );
}

export default function FeedPage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("all");
  const [viewTab, setViewTab] = useState<"all" | "my" | "liked">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  // Upload progress state
  const [uploadState, setUploadState] = useState<{
    active: boolean;
    percent: number;
    title: string;
    status: "uploading" | "processing" | "done" | "error";
    message?: string;
  }>({ active: false, percent: 0, title: "", status: "uploading" });

  useEffect(() => {
    const u = getUser();
    if (u) setMe(u);
    const load = async () => {
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/posts?userId=${u.id}`);
        if (res.ok) {
          const j = await res.json();
          if (j.data?.length) {
            setPosts(j.data);
            setLoading(false);
            return;
          }
        }
      } catch { }
      await new Promise((r) => setTimeout(r, 600));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = posts.filter((p) => {
    const matchView =
      viewTab === "all" ? true :
        viewTab === "my" ? p.authorUserId === me?.id :
          viewTab === "liked" ? p.liked : true;

    const matchTag = activeTag === "all" || p.tags.includes(activeTag);
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    return matchView && matchTag && matchSearch;
  });

  // XHR upload helper with progress
  const uploadFileWithProgress = (file: File, bucket: string, onProgress: (pct: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.url) resolve(json.url);
            else reject(new Error("No URL in response"));
          } catch { reject(new Error("Invalid response")); }
        } else { reject(new Error(`Upload failed (${xhr.status})`)); }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });
  };

  // Background upload handler — called from CreatePostModal
  const handlePost = useCallback(async (pending: PendingPost) => {
    if (!me) return;

    setUploadState({ active: true, percent: 0, title: pending.title, status: "uploading" });

    try {
      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;
      let finalThumbnailUrl: string | null = null;

      const totalFiles = [pending.imageFile, pending.videoFile, pending.thumbnailFile].filter(Boolean).length;
      let completedFiles = 0;

      const trackProgress = (filePct: number) => {
        const base = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;
        const filePortion = totalFiles > 0 ? (1 / totalFiles) * filePct : 0;
        setUploadState((s) => ({ ...s, percent: Math.round(base + filePortion) }));
      };

      if (pending.imageFile) {
        finalImageUrl = await uploadFileWithProgress(pending.imageFile, "blog-media", trackProgress);
        completedFiles++;
      }

      if (pending.videoFile) {
        finalVideoUrl = await uploadFileWithProgress(pending.videoFile, "blog-media", trackProgress);
        completedFiles++;
      }

      if (pending.thumbnailFile) {
        finalThumbnailUrl = await uploadFileWithProgress(pending.thumbnailFile, "blog-media", trackProgress);
        completedFiles++;
      }

      setUploadState((s) => ({ ...s, percent: 100, status: "processing" }));

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: me.id,
          title: pending.title,
          content: pending.content,
          tags: pending.tags,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl,
          thumbnailUrl: finalThumbnailUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");
      const { data } = await res.json();

      const newPost: Post = {
        id: data.id,
        doctorId: me.id,
        authorUserId: me.id,
        doctorName: me.name,
        doctorSpecialty: "Doctor",
        title: pending.title,
        content: pending.content,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        likes: 0,
        comments: [],
        tags: pending.tags,
        createdAt: new Date().toISOString(),
        liked: false,
        saved: false,
      };
      setPosts((prev) => [newPost, ...prev]);

      setUploadState({ active: true, percent: 100, title: pending.title, status: "done" });
      setTimeout(() => setUploadState((s) => ({ ...s, active: false })), 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadState({ active: true, percent: 0, title: pending.title, status: "error", message: err.message });
      setTimeout(() => setUploadState((s) => ({ ...s, active: false })), 5000);
    }
  }, [me]);

  const handleUpdate = (post: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    if (post.liked !== posts.find(p => p.id === post.id)?.liked) {
      if (!me) return;
      fetch(`/api/posts/${post.id}/like`, {
        method: post.liked ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: me.id })
      }).catch(() => { });
    }
  };

  if (!me)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );

  return (
    <div className="space-y-5 max-w-2xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[20px]">
            Medical Feed
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Knowledge sharing among colleagues
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95"
          style={{ background: NAV_BG }}
        >
          <Plus className="w-4 h-4" /> Create Post
        </button>
      </div>

      {/* Create post prompt */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 text-left hover:shadow-md transition-all"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: ACCENT }}
        >
          {me.name[0]}
        </div>
        <span className="text-slate-400 text-[13px]">
          Share a medical insight, tip, or case…
        </span>
        <div className="ml-auto flex gap-2">
          <Img className="w-4 h-4 text-emerald-400" />
          <Film className="w-4 h-4 text-blue-400" />
        </div>
      </button>

      {/* View Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        {[
          { id: "all", label: "All Posts" },
          { id: "my", label: "My Posts" },
          { id: "liked", label: "Liked Posts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id as any)}
            className={`px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${viewTab === tab.id
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mt-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all capitalize"
            style={
              activeTag === tag
                ? { background: ACCENT, color: "white", borderColor: ACCENT }
                : {
                  background: "white",
                  color: "#64748b",
                  borderColor: "#e2e8f0",
                }
            }
          >
            {tag === "all" ? "All Posts" : `#${tag}`}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-white rounded-2xl animate-pulse border border-slate-100"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
          <Sparkles className="w-9 h-9 text-slate-200 mb-3" />
          <p className="font-bold text-slate-500">No posts found</p>
          <p className="text-[12px] text-slate-400 mt-1">
            Be the first to share something!
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ background: ACCENT }}
          >
            Create First Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              me={me}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          me={me}
          onClose={() => setShowCreate(false)}
          onPost={handlePost}
        />
      )}

      {/* ── Instagram-style upload progress toast ─── */}
      {uploadState.active && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md animate-fade-up"
          style={{ animationDuration: "0.3s" }}
        >
          <div
            className="rounded-2xl p-4 shadow-2xl border border-slate-200 backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.97)" }}
          >
            <div className="flex items-center gap-3">
              {uploadState.status === "done" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              ) : uploadState.status === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: ACCENT }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">
                  {uploadState.status === "done"
                    ? "Post published!"
                    : uploadState.status === "error"
                      ? "Upload failed"
                      : uploadState.status === "processing"
                        ? "Creating post…"
                        : `Uploading "${uploadState.title}"`}
                </p>
                {uploadState.status === "error" && uploadState.message && (
                  <p className="text-[11px] text-rose-500 mt-0.5">{uploadState.message}</p>
                )}
                {(uploadState.status === "uploading" || uploadState.status === "processing") && (
                  <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadState.percent}%`,
                        background: `linear-gradient(90deg, ${ACCENT}, #00a1e4)`,
                      }}
                    />
                  </div>
                )}
                {uploadState.status === "uploading" && (
                  <p className="text-[10px] text-slate-400 mt-1">{uploadState.percent}% uploaded</p>
                )}
              </div>
              {uploadState.status === "done" && (
                <button
                  onClick={() => setUploadState((s) => ({ ...s, active: false }))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

