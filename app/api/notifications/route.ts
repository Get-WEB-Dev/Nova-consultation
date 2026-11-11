/**
 * Notifications API (every user only ever sees their own)
 *
 * GET    /api/notifications                latest notifications   (?limit=60&before=<iso>)
 * GET    /api/notifications?id=<id>        one notification (for deep links to older ones)
 * PATCH  /api/notifications                { notifId, read?: boolean }  or  { markAll: true }
 * DELETE /api/notifications                { notifId }  or  { clearRead: true }
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { requireUser, isSelf, forbidden, isUuid } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? auth.user.id;
  if (!isSelf(auth.user, userId)) return forbidden();

  try {
    const admin: any = createAdminClient();

    const id = searchParams.get('id');
    if (id) {
      if (!isUuid(id)) return NextResponse.json({ data: [] });
      const { data } = await admin.from('notifications').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
      return NextResponse.json({ data: data ? [data] : [] });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '', 10) || 60, 100);
    const before = searchParams.get('before');
    let query = admin.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(limit);
    if (before && !Number.isNaN(Date.parse(before))) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('[notifications GET]', err.message);
    return NextResponse.json({ data: [], error: 'Could not load notifications' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  const { notifId, markAll } = body ?? {};
  const read = body?.read === false ? false : true;

  try {
    const admin: any = createAdminClient();
    if (markAll) {
      const { error } = await admin.from('notifications').update({ read: true }).eq('user_id', auth.user.id).eq('read', false);
      if (error) throw error;
    } else if (notifId && isUuid(notifId)) {
      // Only the owner's row can match
      const { data, error } = await admin.from('notifications').update({ read }).eq('id', notifId).eq('user_id', auth.user.id).select('id');
      if (error) throw error;
      if (!data?.length) return forbidden();
    } else {
      return NextResponse.json({ error: 'notifId or markAll required' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notifications PATCH]', err.message);
    return NextResponse.json({ error: 'Could not update the notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }

  try {
    const admin: any = createAdminClient();
    if (body?.clearRead) {
      const { data, error } = await admin.from('notifications').delete().eq('user_id', auth.user.id).eq('read', true).select('id');
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
    }
    if (body?.notifId && isUuid(body.notifId)) {
      const { data, error } = await admin.from('notifications').delete().eq('id', body.notifId).eq('user_id', auth.user.id).select('id');
      if (error) throw error;
      if (!data?.length) return forbidden();
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'notifId or clearRead required' }, { status: 400 });
  } catch (err: any) {
    console.error('[notifications DELETE]', err.message);
    return NextResponse.json({ error: 'Could not delete' }, { status: 500 });
  }
}