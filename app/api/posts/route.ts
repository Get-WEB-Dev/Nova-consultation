import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── MOCK DATA (disabled) ─────────────────────────────────────
// import postsMock from '@/data/posts.mock.json';
// ─────────────────────────────────────────────────────────────

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');
  const tag = searchParams.get('tag');

  try {
    const { fetchBlogPosts } = await import('@/lib/server/queries');
    const posts = await fetchBlogPosts({
      doctorId: doctorId ?? undefined,
      tag: tag ?? undefined,
    });

    const formatted = posts.map((p) => ({
      id: p.id,
      doctorId: p.doctor_id,
      doctorName: (p as any).doctor_profiles?.users?.name ?? '',
      doctorAvatar: (p as any).doctor_profiles?.users?.avatar_url ?? '',
      doctorSpecialty: (p as any).doctor_profiles?.specialty ?? '',
      date: p.published_at ?? p.created_at,
      title: p.title,
      content: p.content,
      image: p.cover_image ?? null,
      thumbnail: p.thumbnail ?? null,
      video: p.video_url ?? null,
      likes: p.likes ?? 0,
      comments: p.comment_count ?? 0,
      tags: p.tags ?? [],
      slug: p.slug,
      created_at: p.created_at,
    }));

    return NextResponse.json(
      { data: formatted, count: formatted.length },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err: any) {
    console.error('[posts GET]', err.message);
    return NextResponse.json({ data: [], count: 0, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctorId, title, content, tags, slug, coverImage } = body;
    if (!doctorId || !content) return NextResponse.json({ error: 'doctorId and content required' }, { status: 400 });
    const { createAdminClient } = await import('@/lib/supabase/client');
    const admin = createAdminClient();
    const finalSlug = slug || `post-${Date.now()}`;
    const { data, error } = await admin.from('blog_posts').insert({
      doctor_id: doctorId,
      title: title || 'Health Update',
      content,
      tags: tags || [],
      slug: finalSlug,
      is_published: true,
      published_at: new Date().toISOString(),
      cover_image: coverImage || null,
      likes: 0,
      comment_count: 0,
    } as any).select().single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[posts POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
