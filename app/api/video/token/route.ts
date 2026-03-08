import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * POST /api/video/token
 *
 * Generates a video session token for a consultation room.
 * Returns mock token now. Replace body with LiveKit SDK when integrating:
 *
 *   import { AccessToken } from 'livekit-server-sdk';
 *   const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
 *   at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
 *   const token = await at.toJwt();
 *
 * Required env vars for LiveKit:
 *   LIVEKIT_API_KEY=
 *   LIVEKIT_API_SECRET=
 *   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
 */
export async function POST(req: NextRequest) {
  try {
    const { consultationId, participantIdentity, participantName } = await req.json();

    if (!consultationId || !participantIdentity) {
      return NextResponse.json(
        { error: 'consultationId and participantIdentity required' },
        { status: 400 }
      );
    }

    // Room name matches DB trigger: nova-{uuid-no-dashes}
    const roomName = `nova-${consultationId.replace(/-/g, '')}`;

    // Mock token (replace with LiveKit SDK call)
    const mockToken = Buffer.from(
      JSON.stringify({
        room:     roomName,
        identity: participantIdentity,
        name:     participantName,
        exp:      Date.now() + 3600000,
      })
    ).toString('base64');

    return NextResponse.json({
      token:     mockToken,
      roomName,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? 'wss://your-livekit-server.livekit.cloud',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
