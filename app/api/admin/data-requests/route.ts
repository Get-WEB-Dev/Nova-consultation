import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { parseListParams } from '@/lib/server/admin-list';
import {
    REQUEST_TYPES, REQUEST_STATUSES, listDataRequests, createDataRequest, updateDataRequestStatus,
} from '@/lib/server/data-requests';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { sp, q, from, to } = parseListParams(req);
        return NextResponse.json(await listDataRequests({ q, status: sp.get('status') ?? undefined, from, to }));
    } catch (err: any) {
        const missing = /data_requests|does not exist|schema cache/i.test(err.message);
        return NextResponse.json({ data: [], total: 0, counts: {}, error: missing ? 'Run the Phase 3 SQL (data_requests table is missing).' : err.message }, { status: 500 });
    }
}

// Log a request that arrived by email or phone
export async function POST(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { email, type, details } = await req.json();
        if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.length > 200) return fail('Enter a valid email address');
        if (!(REQUEST_TYPES as readonly string[]).includes(type)) return fail('Choose a request type');
        if (details != null && (typeof details !== 'string' || details.length > 1000)) return fail('Details must be 1000 characters or fewer');

        const created = await createDataRequest({ email, type, details }, auth.user);
        await logAdminAction(auth.user, 'data_request.created', 'data_request', created.id, `${type} · ${created.requester_email}`);
        return NextResponse.json({ data: created });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}

export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { id, status } = await req.json();
        if (!isUuid(id)) return fail('A valid id is required');
        if (!(REQUEST_STATUSES as readonly string[]).includes(status)) return fail('Invalid status');
        const updated = await updateDataRequestStatus(id, status, auth.user.email);
        if (!updated) return fail('Request not found', 404);
        await logAdminAction(auth.user, 'data_request.updated', 'data_request', id, `→ ${status}`);
        return NextResponse.json({ data: updated });
    } catch (err: any) {
        return fail(err.message, 500);
    }
}