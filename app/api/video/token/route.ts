/**
 * POST /api/video/token
 *
 * Returns the Jitsi room name for a consultation.
 * No server-side tokens needed — Jitsi Meet (meet.jit.si) is open.
 * Room name is derived from consultationId for uniqueness.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { consultationId, participantIdentity, participantName } = await req.json();

    if (!consultationId) {
      return NextResponse.json(
        { error: 'consultationId is required' },
        { status: 400 }
      );
    }

    // Unique room name based on consultation UUID
    const roomName = `NovaHealth_${consultationId.replace(/-/g, '')}`;

    return NextResponse.json({
      roomName,
      domain: 'meet.jit.si',
      participantName: participantName || participantIdentity || 'Participant',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
