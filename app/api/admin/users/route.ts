import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { fetchAllUsers } = await import('@/lib/server/admin-queries');
        const users = await fetchAllUsers();
        return NextResponse.json({ data: users });
    } catch (err: any) {
        console.error('[admin/users GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { userId, role } = body;
        if (!userId || !role) {
            return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
        }
        const { updateUserRole } = await import('@/lib/server/admin-queries');
        await updateUserRole(userId, role);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { userId } = body;
        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }
        const { deleteUser } = await import('@/lib/server/admin-queries');
        await deleteUser(userId);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/users DELETE]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
