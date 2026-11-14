/**
 * Follow-up reminders — meant to be called on a schedule (e.g. every hour).
 *   GET or POST /api/cron/follow-up-reminders
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Finds follow-ups that start within the next 24 hours and have not been reminded yet,
 * notifies BOTH the doctor and the patient, and marks them so nobody is reminded twice.
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const WINDOW_HOURS = 24;

function inWords(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `in about ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
}

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin: any = createAdminClient();
    const { createNotification } = await import('@/lib/server/queries');
    const now = Date.now();

    const { data, error } = await admin
      .from('consultations')
      .select('id, patient_id, follow_up_scheduled_at, users!patient_id(name), doctor_profiles!doctor_id(user_id, users!user_id(name))')
      .eq('status', 'follow_up')
      .is('follow_up_reminded_at', null)
      .gte('follow_up_scheduled_at', new Date(now).toISOString())
      .lte('follow_up_scheduled_at', new Date(now + WINDOW_HOURS * 3600 * 1000).toISOString())
      .limit(500);
    if (error) throw error;

    let reminded = 0;
    for (const c of data ?? []) {
      const when = inWords(new Date(c.follow_up_scheduled_at).getTime() - now);
      const patientName = c.users?.name ?? 'your patient';
      const doctorUserId = c.doctor_profiles?.user_id;
      const doctorName = c.doctor_profiles?.users?.name ?? 'your doctor';

      if (doctorUserId) {
        await createNotification({
          userId: doctorUserId, type: 'follow_up', title: 'Follow-up coming up',
          message: `Your follow-up with ${patientName} is ${when}.`,
          actionUrl: `/doctor-dashboard/followups/${c.id}`, refId: c.id, refTable: 'consultations',
        });
      }
      await createNotification({
        userId: c.patient_id, type: 'follow_up', title: 'Follow-up reminder',
        message: `Your follow-up with Dr. ${doctorName.replace(/^dr\.?\s*/i, '')} is ${when}.`,
        doctorName, actionUrl: '/appointments', refId: c.id, refTable: 'consultations',
      });

      await admin.from('consultations').update({ follow_up_reminded_at: new Date().toISOString() }).eq('id', c.id);
      reminded++;
    }
    return NextResponse.json({ reminded });
  } catch (err: any) {
    console.error('[cron follow-up-reminders]', err.message);
    const needsSql = /follow_up_reminded_at/.test(err.message);
    return NextResponse.json({ error: needsSql ? 'Run the follow-ups SQL in Supabase first.' : 'Reminder job failed' }, { status: 500 });
  }
}

export const GET = run;   // Vercel Cron calls with GET
export const POST = run;