import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/alerts/documents?days=30&types=CDL_LICENSE,MEDICAL_CARD&onlyCompliance=1&driverId=
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.max(1, parseInt(searchParams.get("days") || "30", 10));
    const typesParam = searchParams.get("types")?.trim() || "";
    const onlyCompliance = searchParams.get("onlyCompliance") === "1";
    const driverId = searchParams.get("driverId")?.trim() || "";
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const where: any = {
      expiryDate: { not: null, lte: cutoff },
    };

    const complianceTypes = ["CDL_LICENSE", "MEDICAL_CARD", "INSURANCE", "REGISTRATION"];

    if (typesParam) {
      where.type = { in: typesParam.split(",").map((t) => t.trim()).filter(Boolean) };
    } else if (onlyCompliance) {
      where.type = { in: complianceTypes };
    }

    if (driverId) {
      where.driverId = driverId;
    }

    const expiring = await prisma.document.findMany({
      where,
      orderBy: { expiryDate: "asc" },
      include: {
        driver: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        load: { select: { id: true, loadNumber: true } },
      },
    });

    return NextResponse.json({ days, count: expiring.length, items: expiring });
  } catch (error: any) {
    console.error("Document alerts error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju alert-a" }, { status: 500 });
  }
}
