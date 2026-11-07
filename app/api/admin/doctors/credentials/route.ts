import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import { fetchDoctorCredentials, getCredentialDocumentUrl, logAdminAction } from '@/lib/server/admin-queries';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const doctorId = new URL(req.url).searchParams.get('doctorId');
        if (!isUuid(doctorId)) {
            return NextResponse.json({ error: 'A valid doctorId is required' }, { status: 400 });
        }
        const cred = await fetchDoctorCredentials(doctorId);
        if (!cred) return NextResponse.json({ data: null });

        const documentUrl = await getCredentialDocumentUrl(cred.document_path);
        await logAdminAction(auth.user, 'doctor.credentials_viewed', 'doctor', doctorId);

        return NextResponse.json({
            data: {
                licenseNumber: cred.license_number,
                licenseAuthority: cred.license_authority,
                status: cred.status,
                rejectionReason: cred.rejection_reason,
                submittedAt: cred.submitted_at,
                documentUrl,
            },
        });
    } catch (err: any) {
        console.error('[admin/doctors/credentials GET]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}