import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { fetchAdminPosts } = await import('@/lib/server/admin-queries');
        return NextResponse.json({ data: await fetchAdminPosts() });
    } catch (err: any) {
        console.error('[admin/posts GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

// Publish / unpublish
export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { postId, isPublished } = await req.json();
        if (!postId || typeof isPublished !== 'boolean') {
            return NextResponse.json({ error: 'postId and isPublished (true/false) required' }, { status: 400 });
        }
        const { setPostPublished } = await import('@/lib/server/admin-queries');
        await setPostPublished(postId, isPublished);
        const { logAdminAction } = await import('@/lib/server/admin-queries');
        await logAdminAction(auth.user, isPublished ? 'post.published' : 'post.hidden', 'post', postId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/posts PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { postId } = await req.json();
        if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });
        const { data: target } = await (createAdminClient() as any).from('blog_posts').select('title').eq('id', postId).maybeSingle();
        const { deletePostById, logAdminAction } = await import('@/lib/server/admin-queries');
        await deletePostById(postId);
        await logAdminAction(auth.user, 'post.deleted', 'post', postId, target?.title ?? undefined);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/posts DELETE]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}