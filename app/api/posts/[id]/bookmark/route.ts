import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
        const { bookmarkBlogPost } = await import('@/lib/server/queries');
        await bookmarkBlogPost(postId, userId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[posts/[id]/bookmark POST]', err.message);
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
        const { unbookmarkBlogPost } = await import('@/lib/server/queries');
        await unbookmarkBlogPost(postId, userId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[posts/[id]/bookmark DELETE]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
