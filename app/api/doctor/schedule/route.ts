/**
 * Doctor weekly schedule
 *   GET  /api/doctor/schedule   → { data: { schedule, maxPerDay, breakDuration } }
 *   POST /api/doctor/schedule   body: { schedule, maxPerDay, breakDuration }
 *
 * The doctor is always the signed-in user (the id in the request is ignored).
 * Days use the same order as the page: 0 = Monday … 6 = Sunday.
 */
import { NextResponse } from 'next/server';
import { requireUser, forbidden } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const short = (t: string) => String(t).slice(0, 5); // "09:00:00" → "09:00"

export async function GET(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return forbidden('A doctor profile is required');

    try {
        const admin: any = createAdminClient();
        const [rows, profile] = await Promise.all([
            admin.from('doctor_availability').select('day_of_week, start_time, end_time, is_active')
                .eq('doctor_id', doctorId).order('start_time'),
            admin.from('doctor_profiles').select('max_per_day, break_duration_mins').eq('id', doctorId).maybeSingle(),
        ]);
        if (rows.error) throw rows.error;

        // Never saved before → let the page keep its default schedule
        let schedule: Record<string, { enabled: boolean; slots: { start: string; end: string }[] }> | null = null;
        if ((rows.data ?? []).length > 0) {
            schedule = Object.fromEntries(DAY_NAMES.map((d) => [d, { enabled: false, slots: [] as { start: string; end: string }[] }]));
            for (const r of rows.data) {
                const day = schedule[DAY_NAMES[r.day_of_week]];
                day.slots.push({ start: short(r.start_time), end: short(r.end_time) });
                if (r.is_active) day.enabled = true;
            }
        }
        return NextResponse.json({
            data: {
                schedule,
                maxPerDay: profile.data?.max_per_day ?? 10,
                breakDuration: profile.data?.break_duration_mins ?? 15,
            },
        });
    } catch (err: any) {
        console.error('[doctor/schedule GET]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return forbidden('A doctor profile is required');

    try {
        const { schedule, maxPerDay, breakDuration } = await req.json();
        if (!schedule || typeof schedule !== 'object') {
            return NextResponse.json({ error: 'schedule is required' }, { status: 400 });
        }
        const max = Number(maxPerDay ?? 10);
        const brk = Number(breakDuration ?? 15);
        if (!Number.isInteger(max) || max < 1 || max > 100) {
            return NextResponse.json({ error: 'Max patients per day must be 1–100' }, { status: 400 });
        }
        if (!Number.isInteger(brk) || brk < 0 || brk > 120) {
            return NextResponse.json({ error: 'Break must be 0–120 minutes' }, { status: 400 });
        }

        // Validate and flatten the week into table rows
        const rows: any[] = [];
        for (let i = 0; i < DAY_NAMES.length; i++) {
            const day = schedule[DAY_NAMES[i]];
            if (!day) continue;
            for (const slot of day.slots ?? []) {
                if (!TIME_RE.test(slot.start) || !TIME_RE.test(slot.end) || slot.start >= slot.end) {
                    return NextResponse.json(
                        { error: `${DAY_NAMES[i]}: each time slot must start before it ends` },
                        { status: 400 }
                    );
                }
                rows.push({ doctor_id: doctorId, day_of_week: i, start_time: slot.start, end_time: slot.end, is_active: !!day.enabled });
            }
        }

        const admin: any = createAdminClient();
        // Replace the whole week: delete old rows, insert the new ones
        const del = await admin.from('doctor_availability').delete().eq('doctor_id', doctorId);
        if (del.error) throw del.error;
        if (rows.length) {
            const ins = await admin.from('doctor_availability').insert(rows);
            if (ins.error) throw ins.error;
        }
        const upd = await admin.from('doctor_profiles')
            .update({ max_per_day: max, break_duration_mins: brk }).eq('id', doctorId);
        if (upd.error) throw upd.error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[doctor/schedule POST]', err.message);
        const needsSql = /max_per_day|break_duration_mins/.test(err.message);
        return NextResponse.json(
            { error: needsSql ? 'Database is missing the schedule columns. Run the schedule SQL in Supabase.' : err.message },
            { status: 500 }
        );
    }
}