import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function POST(req: Request) {
    let body: any;
    try { body = await req.json(); } catch { return fail('Invalid request'); }

    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const subject = String(body?.subject ?? '').trim();
    const message = String(body?.message ?? '').trim();

    if (name.length < 2 || name.length > 100) return fail('Please enter your name');
    if (!EMAIL.test(email) || email.length > 200) return fail('Please enter a valid email address');
    if (subject.length > 150) return fail('The subject is too long');
    if (message.length < 10 || message.length > 3000) return fail('Your message must be 10–3000 characters');

    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32);

    const admin: any = createAdminClient();
    const { count } = await admin.from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 5) return fail('Too many messages. Please try again later.', 429);

    const { error } = await admin.from('contact_messages')
        .insert({ name, email, subject: subject || null, message, ip_hash: ipHash });
    if (error) {
        console.error('[contact POST]', error.message);
        return fail('Could not send your message. Please try again.', 500);
    }
    return NextResponse.json({ success: true });
}