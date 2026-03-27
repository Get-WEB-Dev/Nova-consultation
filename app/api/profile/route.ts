/**
 * GET  /api/profile?userId=<uuid>   — fetch a user's profile (shared + role-specific)
 * PATCH /api/profile                — update the authenticated user's profile
 *                                     body: { userId, name, phone, dob, bio,
 *                                            bloodType, allergies, emergencyContact,
 *                                            medicalHistory, insuranceProvider, insuranceId }
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Fetch shared user profile
    const { data: rawData, error } = await admin
      .from('users')
      .select('id, name, email, phone, dob, bio, avatar_url, blood_type, allergies, emergency_contact, role, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rawData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data = rawData as any;

    // Fetch role-specific patient profile if exists
    let patientData: any = null;
    if (data.role === 'patient') {
      const { data: pData } = await admin
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      patientData = pData;
    }

    // Fetch admin profile if exists
    let adminData: any = null;
    if (data.role === 'admin') {
      const { data: aData } = await admin
        .from('admins')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      adminData = aData;
    }

    // Merge: prefer patient table values over legacy users table values
    return NextResponse.json({
      id: data.id,
      name: data.name,
      email: data.email,
      phone: patientData?.phone ?? data.phone ?? '',
      dob: patientData?.dob ?? data.dob ?? '',
      bio: data.bio ?? '',
      avatar: data.avatar_url ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=1B3A5C&color=fff&size=128`,
      bloodType: patientData?.blood_type ?? data.blood_type ?? '',
      allergies: patientData?.allergies ?? data.allergies ?? '',
      emergencyContact: patientData?.emergency_contact ?? data.emergency_contact ?? '',
      medicalHistory: patientData?.medical_history ?? '',
      insuranceProvider: patientData?.insurance_provider ?? '',
      insuranceId: patientData?.insurance_id ?? '',
      preferredLanguage: patientData?.preferred_language ?? 'en',
      role: data.role,
      created_at: data.created_at,
      // Admin-specific
      ...(adminData ? {
        department: adminData.department ?? '',
        permissions: adminData.permissions ?? [],
        isSuperAdmin: adminData.is_super_admin ?? false,
      } : {}),
    });
  } catch (err: any) {
    console.error('[profile GET]', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    userId, name, phone, dob, bio, avatar_url,
    bloodType, allergies, emergencyContact,
    medicalHistory, insuranceProvider, insuranceId,
  } = (body ?? {}) as {
    userId: string;
    name?: string;
    phone?: string;
    dob?: string;
    bio?: string;
    avatar_url?: string;
    bloodType?: string;
    allergies?: string;
    emergencyContact?: string;
    medicalHistory?: string;
    insuranceProvider?: string;
    insuranceId?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Update shared users table (name, bio only — shared fields)
    const updatePayload: any = {
      phone: phone || null,
      dob: dob || null,
      bio: bio || null,
      blood_type: bloodType || null,
      allergies: allergies || null,
      emergency_contact: emergencyContact || null,
    };
    if (name) updatePayload.name = name;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;

    const { error } = await admin
      .from('users')
      .update(updatePayload as never)
      .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update role-specific patient table (upsert to handle migration)
    const { data: userRow } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    const userRole = (userRow as any)?.role;

    if (userRole === 'patient') {
      const patientFields: any = {
        user_id: userId,
        phone: phone || null,
        dob: dob || null,
        blood_type: bloodType || null,
        allergies: allergies || null,
        emergency_contact: emergencyContact || null,
      };
      if (medicalHistory !== undefined) patientFields.medical_history = medicalHistory || null;
      if (insuranceProvider !== undefined) patientFields.insurance_provider = insuranceProvider || null;
      if (insuranceId !== undefined) patientFields.insurance_id = insuranceId || null;

      await admin
        .from('patients')
        .upsert(patientFields as never, { onConflict: 'user_id' });
    }

    // Sync name to auth.users metadata
    if (name) {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { name },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[profile PATCH]', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
