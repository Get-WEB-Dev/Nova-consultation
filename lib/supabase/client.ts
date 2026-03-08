/**
 * Nova Health Consultancy — Supabase Client
 *
 * Three exports:
 *   supabase        — browser client (anon key, RLS enforced)
 *   supabaseAdmin   — server-only service role client (bypasses RLS)
 *   storage         — helper for chat attachment bucket
 *
 * Required env vars (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   ← server only, never expose
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Copy .env.example to .env.local and fill in your Supabase project credentials.",
  );
}

// ── Browser client (used in all client components) ────────────
// RLS is ENFORCED. Safe to use in browser bundles.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Server-only admin client (API routes / server actions) ─────
// Bypasses RLS. NEVER import in client components.
// Only used in /app/api/* and lib/server/*.
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side operations.",
    );
  }
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ── Storage bucket names ───────────────────────────────────────
export const STORAGE_BUCKETS = {
  /**
   * Chat attachments sent during consultations.
   * Bucket settings: private, max file size 10MB.
   * Signed URLs (60s expiry) are generated per-download.
   */
  CHAT_ATTACHMENTS: "chat-attachments",
  /**
   * Doctor profile avatars and blog post images.
   * Bucket settings: public (for SEO / CDN).
   */
  DOCTOR_ASSETS: "doctor-assets",
} as const;

// ── Helper: get signed URL for a chat attachment ───────────────
export async function getChatAttachmentUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.CHAT_ATTACHMENTS)
    .createSignedUrl(path, 60);
  if (error) return null;
  return data.signedUrl;
}

// ── Helper: upload a chat attachment ──────────────────────────
export async function uploadChatAttachment(
  consultationId: string,
  file: File,
): Promise<{ path: string; url: string } | null> {
  const ext = file.name.split(".").pop();
  const filename = `${consultationId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.CHAT_ATTACHMENTS)
    .upload(filename, file, { cacheControl: "3600", upsert: false });

  if (error || !data) return null;

  const signedUrl = await getChatAttachmentUrl(data.path);
  return signedUrl ? { path: data.path, url: signedUrl } : null;
}
