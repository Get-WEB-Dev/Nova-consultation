import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    if (!doctorId) {
        return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    try {
        const { fetchDoctorProfileByUserId } = await import('@/lib/server/doctor-queries');
        const profile = await fetchDoctorProfileByUserId(doctorId);
        return NextResponse.json({ data: profile });
    } catch (err: any) {
        console.error('[doctor/profile GET]', err.message);
        return NextResponse.json({ data: null, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { doctorId, status, specialty, hospital, experience_years, fee, consultation_duration_mins, languages, consultation_type } = body;

        if (!doctorId) {
            return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
        }

        const { updateDoctorProfile } = await import('@/lib/server/doctor-queries');

        // Build the update object, only including provided fields
        const updates: any = {};
        if (status !== undefined) updates.status = status;
        if (specialty !== undefined) updates.specialty = specialty;
        if (hospital !== undefined) updates.hospital = hospital;
        if (experience_years !== undefined) updates.experience_years = experience_years;
        if (fee !== undefined) updates.fee = fee;
        if (consultation_duration_mins !== undefined) updates.consultation_duration_mins = consultation_duration_mins;
        if (languages !== undefined) updates.languages = languages;
        if (consultation_type !== undefined) updates.consultation_type = consultation_type;

        await updateDoctorProfile(doctorId, updates);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[doctor/profile PATCH]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
