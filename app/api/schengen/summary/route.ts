import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/schengen/summary
// Returns list of drivers with Schengen remaining days, sorted ascending.
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const now = new Date();
    const windowFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
        status: true,
        schengenManualRemainingDays: true,
        schengenManualAsOf: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        primaryTruck: {
          select: { truckNumber: true },
        },
      },
    });

    const schengenDays = await prisma.schengenDay.findMany({
      where: { date: { gte: windowFrom } },
      select: { driverId: true, date: true, inSchengen: true },
    });

    const byDriver = new Map<string, { inDays: Date[] }>();
    for (const day of schengenDays) {
      if (!day.inSchengen) continue;
      const entry = byDriver.get(day.driverId) || { inDays: [] };
      entry.inDays.push(day.date);
      byDriver.set(day.driverId, entry);
    }

    const rows = drivers.map((driver) => {
      const inDays = byDriver.get(driver.id)?.inDays || [];
      let remainingDays: number;
      let usedDays: number;
      let manual = null as null | { remainingDays: number; asOf: string; daysSinceManual: number };

      if (driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf) {
        const manualFrom = driver.schengenManualAsOf;
        const daysSinceManual = inDays.filter((d) => d >= manualFrom).length;
        remainingDays = Math.max(0, driver.schengenManualRemainingDays - daysSinceManual);
        usedDays = Math.min(90, 90 - remainingDays);
        manual = {
          remainingDays: driver.schengenManualRemainingDays,
          asOf: manualFrom.toISOString(),
          daysSinceManual,
        };
      } else {
        usedDays = inDays.length;
        remainingDays = Math.max(0, 90 - usedDays);
      }

      return {
        driverId: driver.id,
        name: `${driver.user.firstName} ${driver.user.lastName}`,
        email: driver.user.email,
        status: driver.status,
        truckNumber: driver.primaryTruck?.truckNumber || null,
        usedDays,
        remainingDays,
        warning: remainingDays < 7,
        manual,
      };
    });

    rows.sort((a, b) => a.remainingDays - b.remainingDays);

    return NextResponse.json({
      windowDays: 180,
      generatedAt: now.toISOString(),
      drivers: rows,
    });
  } catch (error: any) {
    console.error("Schengen summary error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri učitavanju" },
      { status: 500 }
    );
  }
}
