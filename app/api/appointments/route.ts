// Appointments are now consultation sessions in the on-demand model.
// This stub returns an empty array for backwards compatibility.
// Use /api/consultations?patientId=<id> for real data.
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json([]);
}
