/**
 * POST /api/auth/change-password   body: { oldPassword, newPassword }
 * Works for any signed-in user (patient, doctor or admin).
 * 1) prove they know the current password  2) set the new one.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const user = auth.user;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { oldPassword, newPassword } = body ?? {};

    if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    if (newPassword === oldPassword) {
        return NextResponse.json({ error: 'Choose a password different from the current one' }, { status: 400 });
    }
    if (!user.email) {
        return NextResponse.json({ error: 'Account has no email' }, { status: 400 });
    }

    // 1) Verify the current password with a throwaway client (no session is kept)
    const verifier = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: verifyError } = await verifier.auth.signInWithPassword({ email: user.email, password: oldPassword });
    if (verifyError) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // 2) Set the new password
    const admin: any = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) {
        console.error('[change-password]', error.message);
        return NextResponse.json({ error: 'Could not update the password. Please try again.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}