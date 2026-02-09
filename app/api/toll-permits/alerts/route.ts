import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/toll-permits/alerts?days=30
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.max(1, parseInt(searchParams.get("days") || "30", 10));
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const expiring = await prisma.tollPermit.findMany({
      where: {
        validTo: { lte: cutoff, gte: now },
      },
      orderBy: { validTo: "asc" },
      include: {
        truck: {
          select: {
            id: true,
            truckNumber: true,
            make: true,
            model: true,
          },
        },
      },
    });

    return NextResponse.json({
      days,
      count: expiring.length,
      items: expiring.map((item) => {
        const daysUntil = Math.ceil(
          (new Date(item.validTo).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...item,
          daysUntil,
          urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
        };
      }),
    });
  } catch (error: any) {
    console.error("Toll permit alerts error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju upozorenja" },
      { status: 500 }
    );
  }
}
