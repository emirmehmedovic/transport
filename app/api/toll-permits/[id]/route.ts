import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// PUT /api/toll-permits/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const {
      countryCode,
      countryName,
      type,
      status,
      provider,
      referenceNo,
      validFrom,
      validTo,
      notes,
    } = body;

    const tollPermit = await prisma.tollPermit.update({
      where: { id: params.id },
      data: {
        countryCode: countryCode ? countryCode.toUpperCase() : undefined,
        countryName: countryName ?? undefined,
        type,
        status,
        provider: provider ?? undefined,
        referenceNo: referenceNo ?? undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : undefined,
        notes: notes ?? undefined,
      },
    });

    return NextResponse.json({ tollPermit });
  } catch (error: any) {
    console.error("Toll permit update error:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju putarine/dozvole" },
      { status: 500 }
    );
  }
}

// DELETE /api/toll-permits/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    await prisma.tollPermit.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Toll permit delete error:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju putarine/dozvole" },
      { status: 500 }
    );
  }
}
