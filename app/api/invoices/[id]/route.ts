import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/invoices/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { customer: true, lines: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Faktura nije pronađena" }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Invoice get error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju fakture" }, { status: 500 });
  }
}

// PUT /api/invoices/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { issueDate, dueDate, currency, status, notes, lines } = body;

    const normalizedLines = Array.isArray(lines) ? lines : [];
    const computedLines = normalizedLines.map((l: any) => {
      const quantity = l.quantity ? parseInt(l.quantity) : 1;
      const unitPrice = l.unitPrice ? parseFloat(l.unitPrice) : 0;
      const lineTotal = quantity * unitPrice;
      return {
        description: l.description || "Usluga",
        quantity,
        unitPrice,
        lineTotal,
      };
    });
    const totalAmount = computedLines.reduce((sum, l) => sum + l.lineTotal, 0);

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        issueDate: issueDate ? new Date(issueDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        currency: currency ?? undefined,
        status: status ?? undefined,
        notes: notes ?? undefined,
        totalAmount,
        lines: {
          deleteMany: {},
          create: computedLines,
        },
      },
      include: { lines: true, customer: true },
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error("Invoice update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju fakture" }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    await prisma.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Invoice delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju fakture" }, { status: 500 });
  }
}
