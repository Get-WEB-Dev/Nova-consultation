import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { fetchAdminStats } = await import('@/lib/server/admin-queries');
        const stats = await fetchAdminStats();
        return NextResponse.json({ data: stats });
    } catch (err: any) {
        console.error('[admin/stats GET]', err.message);
        return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
}
