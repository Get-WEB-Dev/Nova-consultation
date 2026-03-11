/**
 * Notifications API
 *
 * GET   /api/notifications?userId=<uuid>          — fetch notifications for a user
 * PATCH /api/notifications                        — mark one or all as read
 *       body: { notifId } | { userId, markAll: true }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  // Always return valid JSON — no userId means no notifications
  if (!userId) {
    return NextResponse.json({ data: [] });
  }

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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { notifId, userId, markAll } = body ?? {};

  try {
    if (markAll && userId) {
      const { markAllNotificationsRead } = await import('@/lib/server/queries');
      await markAllNotificationsRead(userId);
    } else if (notifId) {
      const { markNotificationRead } = await import('@/lib/server/queries');
      await markNotificationRead(notifId);
    } else {
      return NextResponse.json({ error: 'notifId or (userId + markAll) required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[notifications PATCH] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

