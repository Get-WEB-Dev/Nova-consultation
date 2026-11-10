import { NextResponse } from 'next/server';
import { requireUser, isUuid } from '@/lib/server/auth';
import {
    getUserMedical, getConsultationClinical, logSensitiveAccess,
} from '@/lib/server/admin-detail';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

const TYPES = {
    user_medical: { action: 'user.medical_viewed', target: 'user', load: getUserMedical },
    consultation_clinical: { action: 'consultation.clinical_viewed', target: 'consultation', load: getConsultationClinical },
} as const;

/**
 * POST { type, id, reason }  → sensitive data, but ONLY after a written reason
 * has been permanently recorded in the audit log.
 */
export async function POST(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    try {
        const { type, id, reason } = await req.json();
        const rule = (TYPES as any)[type] as (typeof TYPES)[keyof typeof TYPES] | undefined;
        if (!rule) return fail('Unknown data type');
        if (!isUuid(id)) return fail('A valid id is required');

        const why = typeof reason === 'string' ? reason.trim() : '';
        if (why.length < 8 || why.length > 300) {
            return fail('Please explain why you need this information (8–300 characters).');
        }

        const data = await rule.load(id);
        if (!data) return fail('Nothing found', 404);

        // Record FIRST. If the record cannot be written, the data is not shown.
        await logSensitiveAccess(auth.user, rule.action, rule.target, id, why);
        return NextResponse.json({ data });
    } catch (err: any) {
        console.error('[admin/reveal POST]', err.message);
        return fail(err.message || 'Could not load this information', 500);
    }
}