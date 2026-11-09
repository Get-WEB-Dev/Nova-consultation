/**
 * GET /api/admin/verify
 * Tells the signed-in caller whether THEY have admin privileges.
 * The identity comes from the access token; any ?userId= is ignored.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireUser, adminMfaRequired } from '@/lib/server/auth';

// Depends on the caller's token, so it must never be prerendered/cached
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    return NextResponse.json({
        isAdmin: auth.user.isAdmin,
        isSuperAdmin: auth.user.isSuperAdmin,
        aal: auth.user.aal,
        mfaRequired: adminMfaRequired(),
    });
}
