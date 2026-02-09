import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/claims?incidentId=&status=
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get("incidentId")?.trim() || "";
    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    const where: any = {};
    if (incidentId) where.incidentId = incidentId;
    if (status) where.status = status;

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        incident: {
          select: {
            id: true,
            occurredAt: true,
            driver: { select: { user: { select: { firstName: true, lastName: true } } } },
            truck: { select: { truckNumber: true } },
          },
        },
      },
    });

    return NextResponse.json({ claims });
  } catch (error: any) {
    console.error("Claims fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju claimova" }, { status: 500 });
  }
}

// POST /api/claims
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { incidentId, claimNumber, amount, status, notes } = body;

    if (!incidentId) {
      return NextResponse.json({ error: "incidentId je obavezan" }, { status: 400 });
    }

    const claim = await prisma.claim.create({
      data: {
        incidentId,
        claimNumber: claimNumber || null,
        amount: amount ? parseFloat(amount) : 0,
        status: status || "OPEN",
        notes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entity: "DOCUMENT",
        entityId: claim.id,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error: any) {
    console.error("Claim create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju claim-a" }, { status: 500 });
  }
}
