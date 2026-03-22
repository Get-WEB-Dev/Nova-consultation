"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Star, ChevronLeft, Loader2 } from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";

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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
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
      if (!user) { setLoading(false); return; }
      try {
        // Get consultations to find doctor IDs
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
            for (const rev of (j.data ?? [])) {
              if (rev.patientId === user.id) {
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
          } catch { }
        }
        setReviews(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch { }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800 dark:text-white">My Reviews</h1>
            <p className="text-xs text-slate-400">{reviews.length} reviews given</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        ) : reviews.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <Star className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-slate-500">No reviews yet</p>
            <p className="text-sm text-slate-400 mt-1">Complete a consultation to leave a review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={r.doctorAvatar} alt={r.doctorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-white">{r.doctorName}</p>
                    <p className="text-xs text-primary-600 font-medium">{r.doctorSpecialty}</p>
                    <div className="mt-2"><StarRating rating={r.rating} /></div>
                    {r.comment && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{r.comment}</p>}
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(r.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}