import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/customers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: { invoices: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Klijent nije pronađen" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Customer get error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju klijenta" }, { status: 500 });
  }
}

// PUT /api/customers/[id]
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
    const { name, email, phone, vatNumber, address } = body;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name,
        email: email ?? undefined,
        phone: phone ?? undefined,
        vatNumber: vatNumber ?? undefined,
        address: address ?? undefined,
      },
    });

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error("Customer update error:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju klijenta" }, { status: 500 });
  }
}

// DELETE /api/customers/[id]
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

    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Customer delete error:", error);
    return NextResponse.json({ error: "Greška pri brisanju klijenta" }, { status: 500 });
  }
}
