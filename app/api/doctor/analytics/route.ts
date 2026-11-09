/**
 * GET /api/doctor/analytics — performance numbers for the signed-in doctor.
 * Everything is computed from the last 365 days of consultations + reviews.
 * "Seen" = a consultation that actually took place (completed or follow_up).
 */
import { NextResponse } from 'next/server';
import { requireUser, forbidden } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return forbidden('A doctor profile is required');

    try {
        const admin: any = createAdminClient();
        const since = new Date();
        since.setUTCDate(since.getUTCDate() - 365);

        const [cons, revs, profile] = await Promise.all([
            admin.from('consultations')
                .select('status, created_at, duration_minutes, patient_id, outcome')
                .eq('doctor_id', doctorId).gte('created_at', since.toISOString()).limit(5000),
            admin.from('reviews').select('rating').eq('doctor_id', doctorId).eq('is_published', true),
            admin.from('doctor_profiles').select('fee').eq('id', doctorId).maybeSingle(),
        ]);
        if (cons.error) throw cons.error;

        const rows: any[] = cons.data ?? [];
        const seen = rows.filter((r) => r.status === 'completed' || r.status === 'follow_up');
        const missed = rows.filter((r) => r.status === 'missed').length;
        const cancelled = rows.filter((r) => r.status === 'cancelled').length;
        const fee = Number(profile.data?.fee ?? 0);

        // Patients: unique and returning
        const perPatient = new Map<string, number>();
        seen.forEach((r) => perPatient.set(r.patient_id, (perPatient.get(r.patient_id) ?? 0) + 1));
        const returning = Array.from(perPatient.values()).filter((n) => n > 1).length;

        // Average consultation length
        const durations = seen.map((r) => r.duration_minutes).filter((n) => typeof n === 'number' && n > 0);
        const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        // Last 30 days, one bar per day
        const days: string[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setUTCDate(d.getUTCDate() - i);
            days.push(dayKey(d));
        }
        const perDay = days.map((day) => seen.filter((r) => dayKey(new Date(r.created_at)) === day).length);

        // This month vs last month
        const now = new Date();
        const monthStart = (offset: number) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1);
        const inRange = (r: any, from: number, to: number) => {
            const t = new Date(r.created_at).getTime();
            return t >= from && t < to;
        };
        const thisMonth = seen.filter((r) => inRange(r, monthStart(0), Date.now() + 1)).length;
        const lastMonth = seen.filter((r) => inRange(r, monthStart(1), monthStart(0))).length;

        // Busiest weekdays (Monday first)
        const byWeekday = [0, 0, 0, 0, 0, 0, 0];
        seen.forEach((r) => { byWeekday[(new Date(r.created_at).getUTCDay() + 6) % 7]++; });

        // How consultations ended
        const outcomes: Record<string, number> = {};
        seen.forEach((r) => { if (r.outcome) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1; });

        // Ratings
        const ratings: number[] = (revs.data ?? []).map((r: any) => r.rating);
        const ratingDistribution = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r === n).length);
        const avgRating = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)) : 0;

        const attempted = seen.length + missed + cancelled;
        return NextResponse.json({
            data: {
                summary: {
                    totalSeen: seen.length,
                    thisMonth,
                    lastMonth,
                    completionRate: attempted ? Math.round((seen.length / attempted) * 100) : 0,
                    missed,
                    cancelled,
                    uniquePatients: perPatient.size,
                    returningPatients: returning,
                    avgDurationMinutes: avgDuration,
                    avgRating,
                    ratingCount: ratings.length,
                    fee,
                    earningsThisMonth: thisMonth * fee,
                    earningsTotal: seen.length * fee,
                },
                last30: { days, counts: perDay },
                byWeekday,
                outcomes,
                ratingDistribution,
            },
        });
    } catch (err: any) {
        console.error('[doctor/analytics GET]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}