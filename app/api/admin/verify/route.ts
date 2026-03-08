/**
 * GET /api/admin/verify?userId=<uuid>
 * Checks if a user has admin privileges by looking up the admins table.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ isAdmin: false, error: 'userId required' }, { status: 400 });
    }

    try {
        const admin = createAdminClient();

        // Check admins table
        const { data } = await admin
            .from('admins')
            .select('id, is_super_admin')
            .eq('user_id', userId)
            .maybeSingle();

        // Also check users table role as fallback
        if (!data) {
            const { data: userRow } = await admin
                .from('users')
                .select('role')
                .eq('id', userId)
                .maybeSingle();

            return NextResponse.json({
                isAdmin: (userRow as any)?.role === 'admin',
                isSuperAdmin: false,
            });
        }

        return NextResponse.json({
            isAdmin: true,
            isSuperAdmin: (data as any)?.is_super_admin ?? false,
        });
    } catch (err: any) {
        console.error('[admin/verify GET]', err.message);
        return NextResponse.json({ isAdmin: false, error: 'Internal server error' }, { status: 500 });
    }
}
