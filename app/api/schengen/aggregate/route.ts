import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { aggregateSchengenDaysAllDrivers } from "@/lib/schengen-aggregate";

// POST /api/schengen/aggregate
// Admin-only: compute Schengen daily aggregation for last 180 days
export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const result = await aggregateSchengenDaysAllDrivers();
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error("Schengen aggregate error:", error);
    const message =
      error instanceof Error ? error.message : "Greška pri agregaciji Schengen dana";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
