import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET /api/trucks/[id]/expenses - Lista troškova kamiona + agregacija po tipu
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const expenses = await prisma.truckExpense.findMany({
      where: { truckId: params.id },
      orderBy: { date: "desc" },
    });

    const aggregation: Record<string, number> = {};
    for (const exp of expenses) {
      const key = exp.type;
      aggregation[key] = (aggregation[key] || 0) + exp.amount;
    }

    return NextResponse.json({ expenses, totalsByType: aggregation });
  } catch (error: any) {
    console.error("Error fetching truck expenses:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju troškova kamiona" },
      { status: 500 }
    );
  }
}

// POST /api/trucks/[id]/expenses - Kreiranje troška kamiona
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, description, amount, date, receiptPath } = body as {
      type:
        | "FUEL"
        | "TOLLS"
        | "REPAIRS"
        | "MAINTENANCE"
        | "INSURANCE"
        | "REGISTRATION"
        | "OTHER";
      description: string;
      amount: number;
      date: string;
      receiptPath?: string | null;
    };

    if (!type || !description || amount == null || !date) {
      return NextResponse.json(
        { error: "Sva obavezna polja za troškove moraju biti popunjena" },
        { status: 400 }
      );
    }

    const expense = await prisma.truckExpense.create({
      data: {
        truckId: params.id,
        type,
        description,
        amount: Number(amount),
        date: new Date(date),
        receiptPath: receiptPath || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating truck expense:", error);
    return NextResponse.json(
      { error: "Greška pri kreiranju troška kamiona" },
      { status: 500 }
    );
  }
}
