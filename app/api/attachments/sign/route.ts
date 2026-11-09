import { NextResponse } from 'next/server';
import { requireUser, getThreadAccess } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';
import { parseAttachmentRef, toPrivateRef } from '@/lib/attachment-ref';

export const dynamic = 'force-dynamic';

const BUCKET = 'chat-attachments';
const headers = { 'Cache-Control': 'no-store' };
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers });

/**
 * GET /api/attachments/sign?ref=<private://... or an old public URL>
 * Returns a link that works for 5 minutes, but only for people who belong
 * to the chat the file was sent in (or who uploaded it themselves).
 */
export async function GET(req: Request) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    const user = auth.user;

    const ref = parseAttachmentRef(new URL(req.url).searchParams.get('ref'));
    if (!ref) return fail('Invalid file reference', 400);

    const admin: any = createAdminClient();

    // 1) You can always open what you uploaded yourself
    let allowed = ref.path.startsWith(`${user.id}/`);

    // 2) Otherwise you must be the patient or doctor of a chat that contains this file
    if (!allowed) {
        const legacyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ref.path}`;
        const { data: msgs } = await admin
            .from('messages')
            .select('consultation_id, conversation_id, doctor_id, patient_id')
            .in('attachment_url', [toPrivateRef(ref.path), legacyUrl])
            .limit(20);

        for (const m of msgs ?? []) {
            const access = await getThreadAccess(user, {
                consultationId: m.consultation_id ?? undefined,
                conversationId: m.conversation_id ?? undefined,
                doctorId: m.doctor_id ?? undefined,
                patientId: m.patient_id ?? undefined,
            });
            // Admins are deliberately NOT allowed: medical files stay between patient and doctor
            if (access && (access.asDoctor || access.asPatient)) {
                allowed = true;
                break;
            }
        }
    }
    if (!allowed) return fail('You do not have access to this file', 403);

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(ref.path, 300);
    if (error || !data?.signedUrl) return fail('File not found', 404);

    return NextResponse.json({ url: data.signedUrl }, { headers });
}