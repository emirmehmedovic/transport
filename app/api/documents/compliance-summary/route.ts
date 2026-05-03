import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { getComplianceSummary } from "@/lib/compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: "Nevažeća autentifikacija" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const summary = await getComplianceSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Compliance summary error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju compliance pregleda" },
      { status: 500 }
    );
  }
}
