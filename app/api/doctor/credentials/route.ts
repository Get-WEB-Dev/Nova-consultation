import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const BUCKET = 'doctor-credentials';
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
    'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return NextResponse.json({ data: null });

    const admin: any = createAdminClient();
    const { data } = await admin.from('doctor_credentials')
        .select('license_number, license_authority, status, rejection_reason, submitted_at')
        .eq('doctor_id', doctorId).maybeSingle();

    return NextResponse.json({
        data: data ? {
            licenseNumber: data.license_number,
            licenseAuthority: data.license_authority,
            status: data.status,
            rejectionReason: data.rejection_reason,
            submittedAt: data.submitted_at,
        } : null,
    });
}

export async function POST(req: Request) {
    const auth = await requireUser(req, ['doctor', 'professional']);
    if (auth.error) return auth.error;
    const doctorId = auth.user.doctorProfileId;
    if (!doctorId) return fail('Complete your doctor profile first');

    let form: FormData;
    try { form = await req.formData(); } catch { return fail('Expected multipart form data'); }

    const licenseNumber = String(form.get('licenseNumber') ?? '').trim();
    const licenseAuthority = String(form.get('licenseAuthority') ?? '').trim().slice(0, 120);
    const file = form.get('file');

    if (licenseNumber.length < 3 || licenseNumber.length > 50) return fail('Enter a valid license number');
    if (!(file instanceof File)) return fail('Attach your license document');
    const ext = EXT_BY_TYPE[file.type];
    if (!ext) return fail('Only PDF, JPG, PNG or WebP files are allowed');
    if (file.size > MAX_BYTES) return fail('File must be 5 MB or smaller', 413);

    const admin: any = createAdminClient();
    const { data: existing } = await admin.from('doctor_credentials')
        .select('status, document_path').eq('doctor_id', doctorId).maybeSingle();
    if (existing?.status === 'approved') return fail('Your credentials are already approved', 409);

    // We choose the filename; the user's filename is never used.
    const path = `${doctorId}/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return fail(upErr.message, 500);

    const { error: dbErr } = await admin.from('doctor_credentials').upsert({
        doctor_id: doctorId,
        license_number: licenseNumber,
        license_authority: licenseAuthority || null,
        document_path: path,
        status: 'pending',
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
    }, { onConflict: 'doctor_id' });

    if (dbErr) {
        await admin.storage.from(BUCKET).remove([path]); // don't leave an orphan file
        return fail(dbErr.message, 500);
    }
    if (existing?.document_path) {
        await admin.storage.from(BUCKET).remove([existing.document_path]);
    }
    return NextResponse.json({ success: true });
}