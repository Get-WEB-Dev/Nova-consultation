import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import {
    fetchAllDoctors, toggleDoctorPublished, toggleDoctorVerified,
    approveDoctor, rejectDoctor, logAdminAction,
} from '@/lib/server/admin-queries';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        return NextResponse.json({ data: await fetchAllDoctors() });
    } catch (err: any) {
        console.error('[admin/doctors GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}

// actions: publish {value} | verify {value} | reject {reason}
export async function PATCH(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { doctorId, action, value, reason } = await req.json();
        if (!isUuid(doctorId) || !action) return fail('A valid doctorId and action are required');

        if (action === 'publish') {
            const publish = value ?? true;
            await toggleDoctorPublished(doctorId, publish);
            await logAdminAction(auth.user, publish ? 'doctor.published' : 'doctor.unpublished', 'doctor', doctorId);
        } else if (action === 'verify') {
            if (value === false) {
                await toggleDoctorVerified(doctorId, false);
                await logAdminAction(auth.user, 'doctor.unverified', 'doctor', doctorId);
            } else {
                await approveDoctor(doctorId, auth.user.id);
                await logAdminAction(auth.user, 'doctor.verified', 'doctor', doctorId);
            }
        } else if (action === 'reject') {
            const why = typeof reason === 'string' ? reason.trim() : '';
            if (why.length < 10 || why.length > 500) {
                return fail('Give the doctor a reason (10–500 characters)');
            }
            await rejectDoctor(doctorId, auth.user.id, why);
            await logAdminAction(auth.user, 'doctor.rejected', 'doctor', doctorId, why);
        } else {
            return fail('Invalid action');
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[admin/doctors PATCH]', err.message);
        return fail(err.message, 500);
    }
}