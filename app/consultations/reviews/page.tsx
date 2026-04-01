"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Star,
  ChevronLeft,
  Loader2,
  Stethoscope,
  TrendingUp,
  Award,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";

const NAV_BG = "#1a3558";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

interface Review {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorAvatar: string;
  doctorSpecialty: string;
  rating: number;
  comment: string;
  date: string;
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const cls = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

function RatingBar({
  count,
  total,
  star,
}: {
  count: number;
  total: number;
  star: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-slate-500 w-3">
        {star}
      </span>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "#e2e8f0" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "#fbbf24" }}
        />
      </div>
      <span className="text-[10px] text-slate-400 w-5 text-right">{count}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let user = getUser();
      if (!user) user = await loadUser();
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/consultations?patientId=${user.id}`);
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const doctorIds = Array.from(new Set(data.map((s: any) => s.doctorId)));
        const all: Review[] = [];
        for (const dId of doctorIds) {
          try {
            const r = await fetch(`/api/reviews?doctorId=${dId}`);
            const j = await r.json();
            const docSession = data.find((s: any) => s.doctorId === dId);
            for (const rev of j.data ?? []) {
              if (rev.patientId === user!.id) {
                all.push({
                  id: rev.id,
                  doctorId: dId,
                  doctorName: docSession?.doctorName ?? "Doctor",
                  doctorAvatar: docSession?.doctorAvatar ?? "",
                  doctorSpecialty: docSession?.doctorSpecialty ?? "",
                  rating: rev.rating,
                  comment: rev.text ?? "",
                  date: rev.date,
                });
              }
            }
          } catch {}
        }
        setReviews(
          all.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        );
      } catch {}
      setLoading(false);
    })();
  }, []);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      {/* ── Header band ── */}
      <div
        style={{ background: NAV_BG }}
        className="px-4 sm:px-6 pt-5 pb-8 relative overflow-hidden"
      >
        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)",
            transform: "translate(20%,-30%)",
          }}
        />
        <div className="max-w-2xl mx-auto relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[12px] font-semibold mb-4 transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
            }
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(56,189,248,0.2)" }}
            >
              <Star className="w-5 h-5" style={{ color: SKY }} />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-[20px] leading-tight">
                My Re
              </h1>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Feedback you've left for your doctors
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* ── Summary card ── */}
        {!loading && reviews.length > 0 && (
          <div
            className="bg-white border border-slate-200 rounded-2xl p-5"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
          >
            <div className="flex items-center gap-5">
              <div className="text-center flex-shrink-0">
                <p
                  className="font-extrabold leading-none"
                  style={{ fontSize: 42, color: NAV_BG }}
                >
                  {avgRating}
                </p>
                <StarRating rating={Math.round(parseFloat(avgRating))} />
                <p className="text-[10px] text-slate-400 mt-1">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div
                className="w-px self-stretch"
                style={{ background: "#f1f5f9" }}
              />
              <div className="flex-1 space-y-1.5">
                {ratingCounts.map(({ star, count }) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={count}
                    total={reviews.length}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Award className="w-3.5 h-3.5" style={{ color: ACCENT }} /> Top
                reviewer
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> All
                verified consultations
              </div>
            </div>
          </div>
        )}

        {/* ── Review cards ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: ACCENT }}
            />
          </div>
        ) : reviews.length === 0 ? (
          <div
            className="bg-white border border-slate-200 rounded-2xl p-14 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "#fffbeb" }}
            >
              <Star className="w-7 h-7 text-amber-300" />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              No reviews yet
            </p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-xs mx-auto">
              After completing a consultation, you'll be able to rate and review
              your doctor here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
              >
                {/* Doctor info header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                  <div
                    className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: "#eff6ff" }}
                  >
                    {r.doctorAvatar ? (
                      <Image
                        src={r.doctorAvatar}
                        alt={r.doctorName}
                        width={44}
                        height={44}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Stethoscope
                          className="w-5 h-5"
                          style={{ color: ACCENT }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-slate-900 truncate">
                      {r.doctorName}
                    </p>
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: ACCENT }}
                    >
                      {r.doctorSpecialty}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0"
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-[13px] font-extrabold text-amber-700">
                      {r.rating}.0
                    </span>
                  </div>
                </div>
                {/* Comment body */}
                <div className="px-5 py-4">
                  <StarRating rating={r.rating} />
                  {r.comment ? (
                    <p className="text-[13px] text-slate-600 mt-2.5 leading-relaxed">
                      {r.comment}
                    </p>
                  ) : (
                    <p className="text-[12px] text-slate-300 italic mt-2">
                      No written comment
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-3 font-medium">
                    {new Date(r.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
