import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { listReviews, setReviewPublished, deleteReview } from '@/lib/server/admin-extra';
import { parseListParams } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to } = parseListParams(req);
        return NextResponse.json(await listReviews({ q, status: sp.get('status') ?? undefined, from, to }));
    } catch (err: any) {
        console.error('[admin/reviews GET]', err.message);
        return NextResponse.json({ data: [], total: 0, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { reviewId, isPublished } = await req.json();
        if (!isUuid(reviewId) || typeof isPublished !== 'boolean') return fail('reviewId and isPublished are required');
        await setReviewPublished(reviewId, isPublished);
        await logAdminAction(auth.user, isPublished ? 'review.published' : 'review.hidden', 'review', reviewId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { reviewId } = await req.json();
        if (!isUuid(reviewId)) return fail('A valid reviewId is required');
        await deleteReview(reviewId);
        await logAdminAction(auth.user, 'review.deleted', 'review', reviewId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}