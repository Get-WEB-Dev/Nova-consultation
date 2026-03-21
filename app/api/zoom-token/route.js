import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("roomName");
    const role = parseInt(searchParams.get("role") || "1", 10); // 1 = participant, 0 = host

    if (!roomName) {
        return NextResponse.json(
            { error: "roomName query param is required" },
            { status: 400 }
        );
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
