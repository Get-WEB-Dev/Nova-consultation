import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client'; export const revalidate = 300;

// ─────────────────────────────────────────
// GET POSTS
// ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctorId');
  const tag = searchParams.get('tag');
  const userId = searchParams.get('userId');

  try {
    const { fetchBlogPosts } = await import('@/lib/server/queries');
    const { createAdminClient } = await import('@/lib/supabase/client');
    const admin = createAdminClient();

    const posts = await fetchBlogPosts({
      doctorId: doctorId ?? undefined,
      tag: tag ?? undefined,
    });

    let userLikes = new Set<string>();
    let userBookmarks = new Set<string>();

    if (userId && posts.length > 0) {
      const postIds = posts.map(p => p.id);

      const [{ data: likes }, { data: bookmarks }] = await Promise.all([
        admin.from('blog_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
        admin.from('blog_bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds)
      ]);

      if (likes) (likes as any[]).forEach(l => userLikes.add(l.post_id));
      if (bookmarks) (bookmarks as any[]).forEach(b => userBookmarks.add(b.post_id));
    }

    const formatted = posts.map((p: any) => ({
      id: p.id,
      doctorId: p.doctor_id,
      authorUserId: p.doctor_profiles?.user_id,
      doctorName: p.doctor_profiles?.users?.name ?? '',
      doctorAvatar: p.doctor_profiles?.users?.avatar_url ?? '',
      doctorSpecialty: p.doctor_profiles?.specialty ?? '',
      createdAt: p.published_at ?? p.created_at,
      title: p.title,
      content: p.content,
      imageUrl: p.cover_image ?? null,
      thumbnail: p.thumbnail ?? null,
      videoUrl: p.video_url ?? null,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: [],
      tags: p.tags ?? [],
      slug: p.slug,
      liked: userLikes.has(p.id),
      saved: userBookmarks.has(p.id),
    }));

    return NextResponse.json(
      { data: formatted, count: formatted.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: any) {
    console.error('[posts GET FULL ERROR]', err);
    return NextResponse.json(
      { data: [], count: 0, error: err.message },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────
// CREATE POST
// ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { doctorId, title, content, tags, slug, imageUrl, videoUrl, thumbnailUrl } = body;

    // ✅ Validation
    if (!doctorId || !title || !content) {
      return NextResponse.json(
        { error: 'doctorId, title, and content are required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 🔥 STEP 1: Convert user_id → doctor_profiles.id
    const { data: doctorProfile, error: doctorError } = (await admin
      .from('doctor_profiles')
      .select('id')
      .eq('user_id', String(doctorId))
      .single()) as { data: { id: string } | null; error: any };

    if (doctorError || !doctorProfile) {
      console.error('[Doctor Mapping Error]', doctorError);
      throw new Error('Doctor profile not found');
    }

    const realDoctorId = doctorProfile.id;

    // 🔥 STEP 2: Safe unique slug
    const finalSlug =
      slug ||
      `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 🔥 STEP 3: Insert post
    const { data, error } = await admin
      .from('blog_posts')
      .insert({
        doctor_id: realDoctorId,
        title,
        content,
        tags: tags || [],
        slug: finalSlug,
        is_published: true,
        published_at: new Date().toISOString(),
        cover_image: imageUrl || null,
        video_url: videoUrl || null,
        category_id: null,
        excerpt: null,
        thumbnail: thumbnailUrl || null,
        meta_title: null,
        meta_description: null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[posts POST DB ERROR]', error);
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (err: any) {
    console.error('[posts POST FULL ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}