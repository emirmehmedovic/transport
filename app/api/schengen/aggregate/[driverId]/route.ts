import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { aggregateSchengenDaysForDriver } from "@/lib/schengen-aggregate";

// POST /api/schengen/aggregate/[driverId]
// Admin-only: Re-aggregate Schengen days for a specific driver
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ driverId: string }> }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const { driverId } = await params;

    // Aggregate last 180 days (Schengen rolling window)
    const now = new Date();
    const from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const result = await aggregateSchengenDaysForDriver(driverId, from, now);

    return NextResponse.json({
      ok: true,
      driverId,
      days: result.days,
      from: from.toISOString(),
      to: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Driver Schengen aggregate error:", error);
    const message =
      error instanceof Error ? error.message : "Greška pri agregaciji Schengen dana";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
