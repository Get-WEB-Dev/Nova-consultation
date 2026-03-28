import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from "@/lib/supabase/client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    try {
        const admin = createAdminClient();

        let finalDoctorId = doctorId;
        try {
            const { data: profile } = await admin
                .from('doctor_profiles')
                .select('id')
                .eq('user_id', doctorId)
                .maybeSingle();
            if (profile) finalDoctorId = (profile as any).id;
        } catch (e) { /* ignore */ }

        // Find completed consultations without structured notes
        const { data, error } = await admin
            .from('consultations')
            .select(`
                id,
                notes,
                summary,
                diagnosis,
                prescription,
                clinical_notes,
                users!patient_id(name)
            `)
            .eq('doctor_id', finalDoctorId)
            .eq('status', 'completed')
            .is('diagnosis', null)
            .order('updated_at', { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }

        const pendingTasks = (data || []).map((c: any) => {
            const patientName = c.users?.name || 'Unknown Patient';
            const hasSomeNotes = c.notes || c.prescription || c.clinical_notes;
            return {
                id: c.id,
                type: 'note' as const,
                patientName,
                details: hasSomeNotes ? 'Diagnosis pending' : 'Consultation notes pending',
            };
        });

        return NextResponse.json({ data: pendingTasks });
    } catch (err: any) {
        console.error('[doctor/pending-tasks GET]', err.message);
        return NextResponse.json({ data: [], error: err.message }, { status: 500 });
    }
}
