import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/invoices
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim().toUpperCase() || "";
    const customerId = searchParams.get("customerId")?.trim() || "";

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        lines: true,
      },
    });

    return NextResponse.json({ invoices });
  } catch (error: any) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju faktura" }, { status: 500 });
  }
}

// POST /api/invoices
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, issueDate, dueDate, currency, status, notes, lines, loadIds } = body;

    if (!customerId || !issueDate || !dueDate) {
      return NextResponse.json(
        { error: "Obavezna polja: customerId, issueDate, dueDate" },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { invoiceNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const last = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
      nextNumber = last + 1;
    }
    const invoiceNumber = `INV-${year}-${nextNumber.toString().padStart(4, "0")}`;

    const normalizedLines = Array.isArray(lines) ? lines : [];
    let extraLines: any[] = [];
    if (Array.isArray(loadIds) && loadIds.length > 0) {
      const loads = await prisma.load.findMany({
        where: { id: { in: loadIds } },
        select: { loadNumber: true, loadRate: true },
      });
      extraLines = loads.map((l) => ({
        description: `Load ${l.loadNumber}`,
        quantity: 1,
        unitPrice: l.loadRate,
        lineTotal: l.loadRate,
      }));
    }
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
    const allLines = [...computedLines, ...extraLines];
    const totalAmount = allLines.reduce((sum, l) => sum + l.lineTotal, 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        currency: currency || "EUR",
        status: status || "DRAFT",
        notes: notes || null,
        totalAmount,
        lines: {
          create: allLines,
        },
      },
      include: { lines: true, customer: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error("Invoice create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju fakture" }, { status: 500 });
  }
}
