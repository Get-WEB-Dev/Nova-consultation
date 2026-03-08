/**
 * POST /api/auth/login
 *
 * Optional server-side login endpoint.
 * The client can also call supabase.auth.signInWithPassword() directly
 * (that is safe — it only uses the anon key).
 *
 * This route is provided so future server-side session handling
 * (e.g. SSR auth with cookies) can be added here without touching
 * the frontend.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json(
      { error: "Server configuration error.", code: "server_error" },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", code: "bad_request" },
      { status: 400 }
    );
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required.", code: "missing_fields" },
      { status: 400 }
    );
  }

  // Use anon client for login — this is correct and safe on the server too
  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.toLowerCase().includes("invalid login") ||
      msg.toLowerCase().includes("invalid credentials") ||
      msg.toLowerCase().includes("email not confirmed")
    ) {
      return NextResponse.json(
        { error: "Invalid email or password. Please try again.", code: "invalid_credentials" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: msg || "Login failed.", code: "auth_error" },
      { status: 400 }
    );
  }

  if (!data.user) {
    return NextResponse.json(
      { error: "Login failed.", code: "auth_error" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name ?? data.user.email?.split("@")[0],
      role: data.user.user_metadata?.role ?? "user",
      avatar: data.user.user_metadata?.avatar_url,
    },
  });
}
