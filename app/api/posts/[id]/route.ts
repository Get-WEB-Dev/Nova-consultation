import { NextResponse } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// import postsMock from '@/data/posts.mock.json';
// ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const { fetchBlogPostBySlug } = await import('@/lib/server/queries');
    const post = await fetchBlogPostBySlug(id);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      id:              post.id,
      doctorId:        post.doctor_id,
      doctorName:      (post as any).users?.name              ?? '',
      doctorAvatar:    (post as any).users?.avatar_url         ?? '',
      doctorSpecialty: (post as any).doctor_profiles?.specialty ?? '',
      date:            post.published_at ?? post.created_at,
      title:           post.title,
      content:         post.content,
      image:           post.cover_image   ?? null,
      thumbnail:       post.thumbnail     ?? null,
      video:           post.video_url     ?? null,
      likes:           post.likes         ?? 0,
      comments:        post.comment_count ?? 0,
      tags:            post.tags          ?? [],
      slug:            post.slug,
      created_at:      post.created_at,
    });
  } catch (err: any) {
    console.error('[posts/[id] GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
