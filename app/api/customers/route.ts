import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/customers
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { vatNumber: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    console.error("Customers fetch error:", error);
    return NextResponse.json({ error: "Greška pri učitavanju klijenata" }, { status: 500 });
  }
}

// POST /api/customers
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, vatNumber, address } = body;
    if (!name) {
      return NextResponse.json({ error: "Naziv je obavezan" }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        vatNumber: vatNumber || null,
        address: address || null,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error: any) {
    console.error("Customer create error:", error);
    return NextResponse.json({ error: "Greška pri kreiranju klijenta" }, { status: 500 });
  }
}
