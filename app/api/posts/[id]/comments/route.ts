/**
 * Blog Post Comments API
 *
 * GET  /api/posts/[id]/comments          — fetch comments for a post
 * POST /api/posts/[id]/comments          — create a new comment
 *      body: { authorId, body }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const { id: postId } = params;

    try {
        const { fetchBlogComments } = await import('@/lib/server/queries');
        const comments = await fetchBlogComments(postId);

        // Group by parent_id to support 1 level of nesting
        const rootComments = comments.filter((c: any) => !c.parent_id);
        const replyComments = comments.filter((c: any) => c.parent_id);

        const formatted = rootComments.map((c: any) => {
            const replies = replyComments
                .filter((r: any) => r.parent_id === c.id)
                .map((r: any) => ({
                    id: r.id,
                    authorId: r.author_id,
                    authorName: r.author_name ?? 'Anonymous',
                    text: r.body,
                    createdAt: r.created_at,
                    likes: 0,
                    liked: false,
                    replies: [],
                }));

            return {
                id: c.id,
                authorId: c.author_id,
                authorName: c.author_name ?? 'Anonymous',
                text: c.body,
                createdAt: c.created_at,
                likes: 0,
                liked: false,
                replies,
            };
        });

        return NextResponse.json({ data: formatted, count: formatted.length });
    } catch (err: any) {
        console.error('[posts/[id]/comments GET]', err.message);
        return NextResponse.json({ data: [], count: 0, error: err.message }, { status: 500 });
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

    const { authorId, parentId, body: text } = body ?? {};
    if (!authorId || !text) {
        return NextResponse.json(
            { error: 'authorId and body are required' },
            { status: 400 }
        );
    }

    try {
        const { createBlogComment, createNotification } = await import('@/lib/server/queries');
        const comment = await createBlogComment({
            postId,
            parentId,
            authorId,
            body: text,
        });

        // Generate notification for the blog post author (doctor)
        try {
            const { createAdminClient } = await import('@/lib/supabase/client');
            const admin = createAdminClient();
            const { data: post } = await admin
                .from('blog_posts')
                .select('doctor_id, title, doctor_profiles!doctor_id(user_id)')
                .eq('id', postId)
                .single();

            if (post) {
                const doctorUserId = (post as any).doctor_profiles?.user_id;
                if (doctorUserId && doctorUserId !== authorId) {
                    await createNotification({
                        userId: doctorUserId,
                        type: 'system',
                        title: 'New comment on your post',
                        message: `Someone commented on "${(post as any).title}".`,
                        actionUrl: `/posts/${postId}`,
                    });
                }
            }
        } catch (notifErr) {
            // Non-fatal: notification failure shouldn't block comment creation
            console.warn('[posts/[id]/comments POST] notification error:', notifErr);
        }

        return NextResponse.json({ data: comment }, { status: 201 });
    } catch (err: any) {
        console.error('[posts/[id]/comments POST]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
