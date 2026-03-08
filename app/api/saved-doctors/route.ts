/**
 * Saved Doctors API
 *
 * GET    /api/saved-doctors?patientId=<uuid>
 *   → { data: string[] }   — array of doctor_profile IDs saved by this patient
 *
 * POST   /api/saved-doctors
 *   body: { patientId, doctorId }
 *   → { success: true }
 *   Uses upsert so saving the same doctor twice is idempotent (no error).
 *
 * DELETE /api/saved-doctors
 *   body: { patientId, doctorId }
 *   → { success: true }
 *
 * Per-user isolation is enforced by filtering on patient_id.
 * The DB has UNIQUE(patient_id, doctor_id) so duplicates are impossible at
 * the data layer even if two requests race.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

// ── GET — fetch saved doctor IDs for one patient ──────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');

  // Always return valid JSON even when there's no data
  if (!patientId) {
    return NextResponse.json({ data: [] });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('saved_doctors')
      .select('doctor_id')
      .eq('patient_id', patientId);

    if (error) {
      console.error('[saved-doctors GET]', error.message);
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    const ids = (data ?? []).map((r: any) => r.doctor_id);
    return NextResponse.json({ data: ids });
  } catch (err: any) {
    console.error('[saved-doctors GET] unexpected:', err.message);
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST — save a doctor (idempotent upsert) ──────────────────
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

    // upsert with onConflict ensures this is always idempotent.
    // The UNIQUE(patient_id, doctor_id) constraint means a second save
    // by the same user for the same doctor is a no-op.
    const { error } = await admin
      .from('saved_doctors')
      .upsert(
        { patient_id: patientId, doctor_id: doctorId },
        { onConflict: 'patient_id,doctor_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('[saved-doctors POST]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[saved-doctors POST] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE — unsave a doctor ──────────────────────────────────
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
      .from('saved_doctors')
      .delete()
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('[saved-doctors DELETE]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[saved-doctors DELETE] unexpected:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
