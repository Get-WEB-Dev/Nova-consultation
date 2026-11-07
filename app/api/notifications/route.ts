/**
 * Notifications API
 *
 * GET   /api/notifications                        — the signed-in user's notifications
 * PATCH /api/notifications                        — mark one or all as read
 *       body: { notifId } | { markAll: true }
 *
 * Users can only read and update their own notifications.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { requireUser, isSelf, forbidden } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? auth.user.id;
  if (!isSelf(auth.user, userId)) return forbidden();

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notifications GET]', error.message);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('[notifications GET] unexpected:', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { notifId, markAll } = body ?? {};

  try {
    if (markAll) {
      const { markAllNotificationsRead } = await import('@/lib/server/queries');
      // Always the caller's own notifications
      await markAllNotificationsRead(auth.user.id);
    } else if (notifId) {
      const admin = createAdminClient();
      const { data: notif } = await admin
        .from('notifications')
        .select('user_id')
        .eq('id', notifId)
        .maybeSingle();
      if (!notif || !isSelf(auth.user, (notif as any).user_id)) return forbidden();

      const { markNotificationRead } = await import('@/lib/server/queries');
      await markNotificationRead(notifId);
    } else {
      return NextResponse.json({ error: 'notifId or markAll required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notifications PATCH] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
