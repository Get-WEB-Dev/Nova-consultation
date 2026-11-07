import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireUser, getConsultationAccess, forbidden } from "@/lib/server/auth";

// Depends on the caller's token, so it must never be prerendered/cached
export const dynamic = 'force-dynamic';

const HEX32 = "[0-9a-f]{32}";
const toUuid = (h) =>
    `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

export async function GET(request) {
    // Only signed-in users can get a token
    const auth = await requireUser(request);
    if (auth.error) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("roomName");
    const requestedRole = parseInt(searchParams.get("role") || "1", 10);
    const role = requestedRole === 0 ? 0 : 1; // only 0 or 1 are valid

    if (!roomName) {
        return NextResponse.json(
            { error: "roomName query param is required" },
            { status: 400 }
        );
    }

    // Room names are built by the app as:
    //   NovaHealth_<consultationId>              (dashes removed)
    //   NovaHealth_<doctorId>_<patientId>        (fallback when no consultation yet)
    // The caller must be a participant of the room they ask for.
    const single = new RegExp(`^NovaHealth_(${HEX32})$`, "i").exec(roomName);
    const pair = new RegExp(`^NovaHealth_(${HEX32})_(${HEX32})$`, "i").exec(roomName);

    let allowed = false;
    if (single) {
        const access = await getConsultationAccess(user, toUuid(single[1].toLowerCase()));
        allowed = !!access;
    } else if (pair) {
        const ids = [toUuid(pair[1].toLowerCase()), toUuid(pair[2].toLowerCase())];
        allowed = user.isAdmin || ids.some((id) => id === user.id || id === user.doctorProfileId);
    }
    if (!allowed) {
        return forbidden("You are not a participant of this consultation");
    }

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
        return NextResponse.json(
            { error: "ZOOM_SDK_KEY and ZOOM_SDK_SECRET must be set" },
            { status: 500 }
        );
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 60 * 60 * 2; // 2 hours

    const payload = {
        app_key: sdkKey,
        tpc: roomName,
        role_type: role,
        version: 1,
        iat,
        exp,
    };

    const token = jwt.sign(payload, sdkSecret, { algorithm: "HS256" });

    return NextResponse.json({ token });
}
