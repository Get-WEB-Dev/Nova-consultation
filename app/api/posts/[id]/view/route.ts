import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id: postId } = params;
    try {
        const { incrementBlogViews } = await import('@/lib/server/queries');
        await incrementBlogViews(postId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[posts/[id]/view POST]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
