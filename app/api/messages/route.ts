/**
 * Messages API
 *
 * GET  /api/messages?consultationId=<uuid>   — fetch message history
 * POST /api/messages                         — send a message
 *      body: { consultationId, senderId, senderRole, body }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const consultationId = searchParams.get('consultationId');

  if (!consultationId) {
    return NextResponse.json({ data: [], error: 'consultationId is required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('messages')
      .select('*')
      .eq('consultation_id', consultationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[messages GET]', error.message);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('[messages GET] unexpected:', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { consultationId, senderId, senderRole, body: text } = body ?? {};
  if (!consultationId || !senderId || !text) {
    return NextResponse.json(
      { error: 'consultationId, senderId, and body are required' },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('messages')
      .insert({
        consultation_id: consultationId,
        sender_id:       senderId,
        sender_role:     senderRole ?? 'patient',
        body:            text,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('[messages POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[messages POST] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
