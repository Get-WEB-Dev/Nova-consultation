/**
 * POST /api/auth/signup
 *
 * Handles new user registration entirely server-side so that:
 *   1. SUPABASE_SERVICE_ROLE_KEY is never exposed to the browser.
 *   2. The public.users profile row is inserted with the admin client,
 *      bypassing the RLS policy that would block the insert because
 *      auth.uid() is not yet available at signup time.
 *   3. All Supabase Auth errors (duplicate email, weak password, rate
 *      limit) are caught and returned as structured JSON with
 *      human-readable codes the frontend can switch on.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Validate required server env vars at module load time ─────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  // ── Guard: env vars must be present ────────────────────────
  if (!supabaseUrl || !supabaseAnon || !serviceRoleKey) {
    console.error("[signup] Missing Supabase env vars");
    return NextResponse.json(
      { error: "Server configuration error. Please contact support.", code: "server_error" },
      { status: 500 }
    );
  }

  // ── Parse and validate body ─────────────────────────────────
  let body: {
    email?: string; password?: string; name?: string; role?: string;
    // Doctor-specific fields
    specialty?: string; hospital?: string; experience_years?: number;
    fee?: number; languages?: string[]; gender?: string;
    consultation_type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body.", code: "bad_request" },
      { status: 400 }
    );
  }

  const { email, password, name, role } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required.", code: "missing_fields" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters.", code: "weak_password" },
      { status: 400 }
    );
  }

  const cleanName = (name ?? email.split("@")[0]).trim();
  const cleanRole = (role === "doctor" || role === "professional" || role === "admin") ? role : "user";
  // Map frontend role value → DB enum value
  const dbRole = cleanRole === "user" ? "patient" : cleanRole;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=1B3A5C&color=fff&size=128`;

  // ── Admin client: used for both signUp and profile insert ───
  // createClient with service role key — NEVER sent to the browser.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Step 1: Create the auth.users record ────────────────────
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation for now; set false to require it
    user_metadata: { name: cleanName, role: cleanRole, avatar_url: avatarUrl },
  });

  if (authError) {
    // Map Supabase error messages → clean frontend codes
    const msg = authError.message ?? "";
    if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in.", code: "email_exists" },
        { status: 409 }
      );
    }
    if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("email rate")) {
      return NextResponse.json(
        { error: "Too many sign-up attempts. Please wait a few minutes and try again.", code: "rate_limit" },
        { status: 429 }
      );
    }
    if (msg.toLowerCase().includes("password")) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters.", code: "weak_password" },
        { status: 400 }
      );
    }
    console.error("[signup] Auth error:", authError);
    return NextResponse.json(
      { error: msg || "Sign up failed. Please try again.", code: "auth_error" },
      { status: 400 }
    );
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: "Sign up failed. Please try again.", code: "auth_error" },
      { status: 400 }
    );
  }

  // ── Step 2: Insert the public.users profile row ─────────────
  // Done with the admin client so it bypasses RLS entirely.
  const { error: profileError } = await admin.from("users").insert({
    id: authData.user.id,
    email,
    name: cleanName,
    role: dbRole,
    avatar_url: avatarUrl,
  });

  if (profileError) {
    // Profile insert failed — roll back the auth user to avoid orphaned accounts
    await admin.auth.admin.deleteUser(authData.user.id);
    console.error("[signup] Profile insert error:", profileError);
    return NextResponse.json(
      { error: "Failed to create user profile. Please try again.", code: "profile_error" },
      { status: 500 }
    );
  }

  // ── Step 2b: Insert role-specific profile row ───────────────
  try {
    if (dbRole === "patient") {
      await admin.from("patients").insert({
        user_id: authData.user.id,
      });
    } else if (dbRole === "admin") {
      await admin.from("admins").insert({
        user_id: authData.user.id,
        permissions: ["all"],
        is_super_admin: false,
      });
    } else if (dbRole === "doctor") {
      // Auto-create doctor_profiles so the doctor appears in listings
      const slug = cleanName.toLowerCase().replace(/^dr\.?\s*/i, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await admin.from("doctor_profiles").insert({
        user_id: authData.user.id,
        specialty: body.specialty || "General Practitioner",
        hospital: body.hospital || null,
        experience_years: body.experience_years || 0,
        fee: body.fee || 0,
        languages: body.languages || ["English"],
        tags: [],
        gender: body.gender || null,
        consultation_type: body.consultation_type || "video",
        status: "offline",
        slug: slug || null,
        is_verified: false,
        is_published: true,
        video_provider_identity: `dr-${slug}`,
      } as any);
    }
  } catch (roleErr: any) {
    // Non-fatal: the shared users row exists, role-specific can be retried
    console.warn("[signup] Role profile insert warning:", roleErr.message);
  }

  // ── Step 3: Return minimal safe user data ────────────────────
  // Do NOT return the service role key or full auth data.
  return NextResponse.json(
    {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: cleanName,
        role: cleanRole,
        avatar: avatarUrl,
      },
    },
    { status: 201 }
  );
}
