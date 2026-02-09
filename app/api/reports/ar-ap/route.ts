import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/reports/ar-ap
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const totals = await prisma.invoice.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    const now = new Date();
    const overdue = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["PAID", "VOID"] },
      },
      orderBy: { dueDate: "asc" },
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json({ totals, overdue });
  } catch (error: any) {
    console.error("AR/AP report error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju izvještaja" }, { status: 500 });
  }
}
