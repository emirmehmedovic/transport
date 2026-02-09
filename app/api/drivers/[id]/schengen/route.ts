import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { isInSchengen } from "@/lib/schengen";
import { prisma } from "@/lib/prisma";

// GET /api/drivers/[id]/schengen
// Returns Schengen 90/180 stats based on Position records
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    if (decoded.role === "DRIVER" && decoded.driverId !== params.id) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const now = new Date();
    const windowFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const driver = await prisma.driver.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        schengenManualRemainingDays: true,
        schengenManualAsOf: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Vozač nije pronađen" }, { status: 404 });
    }

    const countSchengenDays = async (from: Date) => {
      const aggregated = await prisma.schengenDay.findMany({
        where: {
          driverId: params.id,
          date: { gte: from },
        },
        select: { date: true, inSchengen: true },
        orderBy: { date: "asc" },
      });

      if (aggregated.length > 0) {
        return aggregated.filter((d) => d.inSchengen).length;
      }

      const positions = await prisma.position.findMany({
        where: {
          driverId: params.id,
          recordedAt: { gte: from },
        },
        select: {
          latitude: true,
          longitude: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: "asc" },
      });

      const daysInSchengen = new Set<string>();
      for (const pos of positions) {
        if (pos.latitude === null || pos.longitude === null) continue;
        if (!isInSchengen(pos.latitude, pos.longitude)) continue;
        const dayKey = new Date(pos.recordedAt).toISOString().slice(0, 10);
        daysInSchengen.add(dayKey);
      }
      return daysInSchengen.size;
    };

    // Manual override: remaining days as of a date, then decrement with new Schengen days
    if (driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf) {
      const manualFrom = new Date(driver.schengenManualAsOf);
      const daysSinceManual = await countSchengenDays(manualFrom);
      const remainingDays = Math.max(0, driver.schengenManualRemainingDays - daysSinceManual);
      const usedDays = Math.min(90, 90 - remainingDays);

      return NextResponse.json({
        windowDays: 180,
        usedDays,
        remainingDays,
        from: manualFrom.toISOString(),
        to: now.toISOString(),
        manual: {
          remainingDays: driver.schengenManualRemainingDays,
          asOf: manualFrom.toISOString(),
          daysSinceManual,
        },
      });
    }

    const aggregated = await prisma.schengenDay.findMany({
      where: {
        driverId: params.id,
        date: { gte: windowFrom },
      },
      select: { date: true, inSchengen: true },
      orderBy: { date: "asc" },
    });

    let usedDays = aggregated.filter((d) => d.inSchengen).length;

    if (aggregated.length === 0) {
      usedDays = await countSchengenDays(windowFrom);
    }
    const remainingDays = Math.max(0, 90 - usedDays);

    return NextResponse.json({
      windowDays: 180,
      usedDays,
      remainingDays,
      from: windowFrom.toISOString(),
      to: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Schengen calc error:", error);
    const message =
      error instanceof Error ? error.message : "Greška pri računanju Schengen 90/180 dana";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
