/**
 * Nova Health — server-side authentication & authorization helpers.
 *
 * Every API route that touches private data must start with one of:
 *
 *   const auth = await requireUser(req);              // any signed-in user
 *   const auth = await requireUser(req, ['admin']);   // admins only
 *   if (auth.error) return auth.error;
 *   const user = auth.user;
 *
 * The caller's identity ALWAYS comes from the verified Supabase access token
 * (Authorization: Bearer <token>), never from ids in the body or query string.
 * Ids sent by the client are only compared against the verified identity.
 *
 * Roles come from the `users` table (source of truth), with the `admins`
 * table also granting admin rights.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export type DbRole = 'patient' | 'doctor' | 'professional' | 'admin';

export interface AuthedUser {
  id: string;
  email: string | null;
  role: DbRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** doctor_profiles.id for this user, or null if they have no doctor profile */
  doctorProfileId: string | null;
  /** Assurance level of THIS session: aal2 means a second factor (TOTP) was used */
  aal: 'aal1' | 'aal2';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

// ── Error responses ───────────────────────────────────────────
// `data: []` keeps existing client code (`json.data ?? []`) from crashing.
export const unauthorized = (message = 'Authentication required') =>
  NextResponse.json({ error: message, data: [] }, { status: 401 });

export const forbidden = (message = 'You do not have access to this resource') =>
  NextResponse.json({ error: message, data: [] }, { status: 403 });

// ── Token → user ──────────────────────────────────────────────
export function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

/**
 * Reads the `aal` claim from the access token. Safe to trust because the token
 * was already verified by supabase.auth.getUser() before this is called.
 */
function tokenAal(token: string): 'aal1' | 'aal2' {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'aal1';
  }
}

/** Set ADMIN_REQUIRE_MFA=true once every admin has enrolled a second factor. */
export const adminMfaRequired = () => process.env.ADMIN_REQUIRE_MFA === 'true';

/** Returns the verified user, or null when there is no valid session. */
export async function getAuthUser(req: Request): Promise<AuthedUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const admin: any = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  // A bad token is a 4xx. Anything else (network, 5xx) is a temporary outage.
  if (error && (!error.status || error.status >= 500)) throw error;
  if (error || !data?.user) return null;
  const uid: string = data.user.id;

  const [userRes, doctorRes, adminRes] = await Promise.all([
    admin.from('users').select('role, is_suspended').eq('id', uid).maybeSingle(),
    admin.from('doctor_profiles').select('id').eq('user_id', uid).maybeSingle(),
    admin.from('admins').select('is_super_admin').eq('user_id', uid).maybeSingle(),
  ]);

  if (userRes.error) throw userRes.error; // database hiccup ≠ signed out
  if (!userRes.data) return null; // auth user without a profile row // auth user without a profile row
  if (userRes.data.is_suspended) return null; // suspended accounts lose all API access

  const role = userRes.data.role as DbRole;
  const isAdmin = role === 'admin' || !!adminRes.data;

  return {
    id: uid,
    email: data.user.email ?? null,
    role,
    isAdmin,
    isSuperAdmin: !!adminRes.data?.is_super_admin,
    doctorProfileId: doctorRes.data?.id ?? null,
    aal: tokenAal(token),
  };
}

type Guard =
  | { user: AuthedUser; error?: undefined }
  | { user?: undefined; error: NextResponse };

/**
 * Require a signed-in user, optionally restricted to certain roles.
 * Passing 'admin' in `roles` also accepts users listed in the admins table.
 */
export async function requireUser(req: Request, roles?: DbRole[]): Promise<Guard> {
  let user: AuthedUser | null = null;
  try {
    user = await getAuthUser(req);
  } catch (err: any) {
    // Next.js uses a thrown error to mark a route as dynamic — let it through
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    console.error('[auth] token verification failed:', err?.message);
    return {
      error: NextResponse.json(
        { error: 'Authentication service is temporarily unavailable. Please try again.', data: [] },
        { status: 503 },
      ),
    };
  }
  if (!user) return { error: unauthorized() };

  if (roles) {
    const effective: DbRole[] = [user.role, ...(user.isAdmin ? (['admin'] as DbRole[]) : [])];
    if (!roles.some((r) => effective.includes(r))) return { error: forbidden() };

    // Admin-only endpoints additionally need a second factor (when switched on)
    if (roles.includes('admin') && user.isAdmin && adminMfaRequired() && user.aal !== 'aal2') {
      return {
        error: NextResponse.json(
          { error: 'Two-factor authentication required', code: 'mfa_required', data: [] },
          { status: 403 },
        ),
      };
    }
  }
  return { user };
}

// ── Ownership checks ──────────────────────────────────────────
/** The id is the caller's own user id (admins pass). */
export function isSelf(user: AuthedUser, id: unknown): boolean {
  return typeof id === 'string' && (user.isAdmin || id === user.id);
}

/**
 * The id refers to the caller as a doctor. The frontend sometimes sends the
 * auth user id and sometimes doctor_profiles.id, so accept both (admins pass).
 */
export function ownsDoctorId(user: AuthedUser, id: unknown): boolean {
  if (typeof id !== 'string' || !id) return false;
  if (user.isAdmin) return true;
  return id === user.id || (!!user.doctorProfileId && id === user.doctorProfileId);
}

/** Map an auth user id OR a doctor_profiles.id to doctor_profiles.id. */
export async function resolveDoctorProfileId(idOrUserId: unknown): Promise<string | null> {
  if (!isUuid(idOrUserId)) return null;
  const admin: any = createAdminClient();
  const { data } = await admin
    .from('doctor_profiles')
    .select('id')
    .or(`id.eq.${idOrUserId},user_id.eq.${idOrUserId}`)
    .maybeSingle();
  return data?.id ?? null;
}

export interface ConsultationAccess {
  consultation: { id: string; doctor_id: string; patient_id: string; status: string };
  asDoctor: boolean;
  asPatient: boolean;
}

/** Load a consultation and check the caller is its patient, its doctor, or an admin. */
export async function getConsultationAccess(
  user: AuthedUser,
  consultationId: unknown,
): Promise<ConsultationAccess | null> {
  if (!isUuid(consultationId)) return null;
  const admin: any = createAdminClient();
  const { data } = await admin
    .from('consultations')
    .select('id, doctor_id, patient_id, status')
    .eq('id', consultationId)
    .maybeSingle();
  if (!data) return null;

  const asPatient = data.patient_id === user.id;
  const asDoctor = !!user.doctorProfileId && data.doctor_id === user.doctorProfileId;
  if (!asPatient && !asDoctor && !user.isAdmin) return null;
  return { consultation: data, asDoctor, asPatient };
}

export interface ThreadAccess {
  doctorProfileId: string | null;
  patientId: string | null;
  asDoctor: boolean;
  asPatient: boolean;
}

/**
 * Check the caller belongs to a chat thread, identified by a consultation,
 * a conversation, or a doctor + patient pair. Returns null when not allowed.
 */
export async function getThreadAccess(
  user: AuthedUser,
  ref: { consultationId?: unknown; conversationId?: unknown; doctorId?: unknown; patientId?: unknown },
): Promise<ThreadAccess | null> {
  const admin: any = createAdminClient();

  if (ref.consultationId) {
    const access = await getConsultationAccess(user, ref.consultationId);
    if (!access) return null;
    return {
      doctorProfileId: access.consultation.doctor_id,
      patientId: access.consultation.patient_id,
      asDoctor: access.asDoctor,
      asPatient: access.asPatient,
    };
  }

  let doctorProfileId: string | null = null;
  let patientId: string | null = null;

  if (ref.conversationId) {
    if (!isUuid(ref.conversationId)) return null;
    const { data } = await admin
      .from('conversations')
      .select('doctor_id, patient_id')
      .eq('id', ref.conversationId)
      .maybeSingle();
    if (!data) return null;
    doctorProfileId = data.doctor_id;
    patientId = data.patient_id;
  } else if (ref.doctorId && ref.patientId) {
    doctorProfileId = await resolveDoctorProfileId(ref.doctorId);
    patientId = isUuid(ref.patientId) ? ref.patientId : null;
  }

  if (!doctorProfileId || !patientId) return null;

  const asPatient = patientId === user.id;
  const asDoctor = !!user.doctorProfileId && doctorProfileId === user.doctorProfileId;
  if (!asPatient && !asDoctor && !user.isAdmin) return null;
  return { doctorProfileId, patientId, asDoctor, asPatient };
}

/** True when this doctor has (or had) a consultation with the patient. */
export async function doctorHasPatient(doctorProfileId: string | null, patientId: string): Promise<boolean> {
  if (!doctorProfileId || !isUuid(patientId)) return false;
  const admin: any = createAdminClient();
  const { data } = await admin
    .from('consultations')
    .select('id')
    .eq('doctor_id', doctorProfileId)
    .eq('patient_id', patientId)
    .limit(1);
  return !!data && data.length > 0;
}

/** Admin-only AND super-admin-only. Use for dangerous actions. */
export async function requireSuperAdmin(req: Request): Promise<Guard> {
  const auth = await requireUser(req, ['admin']);
  if (auth.error) return auth;
  if (!auth.user.isSuperAdmin) {
    return { error: forbidden('Only a super admin can do this') };
  }
  return auth;
}