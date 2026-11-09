/**
 * GET /api/doctor/reviews → the signed-in doctor's patient reviews
 * Shape matches what the Messages page expects: { id, author, rating, text, date }
 */
import { NextResponse } from 'next/server';
import { requireUser, forbidden } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return forbidden('A doctor profile is required');

    try {
        const admin: any = createAdminClient();
        const { data, error } = await admin
            .from('reviews')
            .select('id, rating, comment, created_at, users!patient_id(name)')
            .eq('doctor_id', doctorId)
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;

        return NextResponse.json({
            data: (data ?? []).map((r: any) => ({
                id: r.id,
                author: r.users?.name ?? 'Patient',
                rating: r.rating,
                text: r.comment ?? '',
                date: r.created_at,
            })),
        });
    } catch (err: any) {
        console.error('[doctor/reviews GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}