/**
 * Nova Health Consultancy — Supabase Auth (client-side)
 *
 * Rules enforced here:
 *   - SUPABASE_SERVICE_ROLE_KEY is NEVER imported or used here.
 *     All operations that need it go through /api/auth/* routes.
 *   - signIn uses supabase.auth.signInWithPassword() directly
 *     (safe — only uses the public anon key).
 *   - signUp calls POST /api/auth/signup (server route) so the
 *     service role key stays server-only and the public.users
 *     profile insert bypasses RLS safely.
 */

"use client";

import { supabase } from "./client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "doctor" | "professional" | "admin";
  avatar: string;
}

// ── Map Supabase user → AuthUser ──────────────────────────────
function mapUser(supaUser: SupabaseUser): AuthUser {
  const meta = supaUser.user_metadata ?? {};
  const rawRole = (meta.role as string) ?? "user";
  // Normalize role values
  const role: AuthUser["role"] =
    rawRole === "admin" ? "admin" :
      rawRole === "doctor" ? "doctor" :
        rawRole === "professional" ? "professional" :
          "user";
  return {
    id: supaUser.id,
    name: meta.name ?? supaUser.email?.split("@")[0] ?? "User",
    email: supaUser.email ?? "",
    role,
    avatar:
      meta.avatar_url ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        meta.name ?? "User"
      )}&background=1B3A5C&color=fff&size=64`,
  };
}

// ── In-memory session cache ───────────────────────────────────
let _cachedUser: AuthUser | null = null;

export function getUser(): AuthUser | null {
  return _cachedUser;
}

// ── loadUser — hydrates cache from live Supabase session ──────
export async function loadUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  _cachedUser = user ? mapUser(user) : null;
  return _cachedUser;
}

// ── signIn ────────────────────────────────────────────────────
// supabase.auth.signInWithPassword is safe in the browser —
// it only uses the public anon key, not the service role key.
export async function signIn(
  email: string,
  password: string
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.toLowerCase().includes("invalid login") ||
      msg.toLowerCase().includes("invalid credentials") ||
      msg.toLowerCase().includes("email not confirmed")
    ) {
      throw new Error("Invalid email or password. Please try again.");
    }
    throw new Error(msg || "Sign in failed.");
  }

  if (!data.user) throw new Error("Sign in failed.");

  _cachedUser = mapUser(data.user);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hc-auth-change"));
  }
  return _cachedUser;
}

// ── signUp ────────────────────────────────────────────────────
// Calls POST /api/auth/signup (server route) so the service role
// key stays server-only and the public.users INSERT bypasses RLS.
// After account creation, signs in client-side to set the session.
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: AuthUser["role"] = "user"
): Promise<AuthUser> {
  // Step 1: server creates auth.user + public.users profile
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, role }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error ?? "Sign up failed.");
  }

  // Step 2: sign in client-side to establish browser session
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Account exists but auto-login failed — let user log in manually
    throw new Error("Account created! Please sign in with your new credentials.");
  }

  if (!data.user) throw new Error("Sign up succeeded but session could not be established.");

  _cachedUser = mapUser(data.user);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hc-auth-change"));
  }
  return _cachedUser;
}

// ── signOut ───────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  _cachedUser = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("nova-onboarding-done");
    window.dispatchEvent(new CustomEvent("hc-auth-change"));
  }
}

// ── isLoggedIn ────────────────────────────────────────────────
export function isLoggedIn(): boolean {
  return _cachedUser !== null;
}

// ── onAuthChange — call once in root layout ───────────────────
export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    _cachedUser = session?.user ? mapUser(session.user) : null;
    callback(_cachedUser);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hc-auth-change"));
    }
  });
  return () => subscription.unsubscribe();
}
