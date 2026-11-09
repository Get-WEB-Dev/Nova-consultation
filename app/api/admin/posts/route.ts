import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import { setPostPublished, deletePostById, logAdminAction } from '@/lib/server/admin-queries';
import { listPosts } from '@/lib/server/admin-extra';
import { parseListParams } from '@/lib/server/admin-list';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to } = parseListParams(req);
        return NextResponse.json(await listPosts({ q, status: sp.get('status') ?? undefined, from, to }));
    } catch (err: any) {
        console.error('[admin/posts GET]', err.message);
        return NextResponse.json({ data: [], total: 0, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { postId, isPublished } = await req.json();
        if (!isUuid(postId) || typeof isPublished !== 'boolean') return fail('postId and isPublished (true/false) required');
        await setPostPublished(postId, isPublished);
        await logAdminAction(auth.user, isPublished ? 'post.published' : 'post.hidden', 'post', postId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/posts PATCH]', err.message);
        return fail(err.message, 500);
    }
}

export async function DELETE(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { postId } = await req.json();
        if (!isUuid(postId)) return fail('A valid postId is required');
        const { data: target } = await (createAdminClient() as any).from('blog_posts').select('title').eq('id', postId).maybeSingle();
        await deletePostById(postId);
        await logAdminAction(auth.user, 'post.deleted', 'post', postId, target?.title ?? undefined);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/posts DELETE]', err.message);
        return fail(err.message, 500);
    }
}