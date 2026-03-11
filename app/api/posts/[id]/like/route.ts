/**
 * Blog Post Like API
 *
 * POST   /api/posts/[id]/like          — like a post
 *        body: { userId }
 * DELETE /api/posts/[id]/like          — unlike a post
 *        body: { userId }
 * GET    /api/posts/[id]/like?userId=  — check if user has liked
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id: postId } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ liked: false });
    }

    try {
        const { hasUserLikedPost } = await import('@/lib/server/queries');
        const liked = await hasUserLikedPost(postId, userId);
        return NextResponse.json({ liked });
    } catch (err: any) {
        console.error('[posts/[id]/like GET]', err.message);
        return NextResponse.json({ liked: false, error: err.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id: postId } = params;
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId } = body ?? {};
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const { likeBlogPost } = await import('@/lib/server/queries');
        await likeBlogPost(postId, userId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[posts/[id]/like POST]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id: postId } = params;
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId } = body ?? {};
    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const { unlikeBlogPost } = await import('@/lib/server/queries');
        await unlikeBlogPost(postId, userId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[posts/[id]/like DELETE]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
