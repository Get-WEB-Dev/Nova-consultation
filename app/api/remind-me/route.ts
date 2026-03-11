/**
 * Remind Me API
 *
 * GET    /api/remind-me?patientId=<uuid>&doctorId=<uuid>  — check if reminder is set
 * POST   /api/remind-me  — register a reminder when a doctor comes online
 *   body: { patientId, doctorId }
 * DELETE /api/remind-me  — cancel the reminder
 *   body: { patientId, doctorId }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');
  const doctorId = searchParams.get('doctorId');

  if (!patientId || !doctorId) {
    return NextResponse.json({ active: false });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('remind_me')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('notified', false)
      .maybeSingle();

    if (error) {
      console.error('[remind-me GET]', error.message);
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({ active: !!data });
  } catch (err: any) {
    console.error('[remind-me GET] unexpected:', err.message);
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { patientId, doctorId } = body ?? {};
  if (!patientId || !doctorId) {
    return NextResponse.json({ error: 'patientId and doctorId are required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('remind_me')
      .upsert(
        { patient_id: patientId, doctor_id: doctorId, notified: false } as never,
        { onConflict: 'patient_id,doctor_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[remind-me POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[remind-me POST] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { patientId, doctorId } = body ?? {};
  if (!patientId || !doctorId) {
    return NextResponse.json({ error: 'patientId and doctorId are required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('remind_me')
      .delete()
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('[remind-me DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[remind-me DELETE] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
