import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/drivers/[id]/schengen-override
// Body: { remainingDays: number | null, asOf?: string }
export async function POST(
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
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const remainingDays = body?.remainingDays;
    const asOfRaw = body?.asOf;

    if (remainingDays === null || remainingDays === undefined) {
      await prisma.driver.update({
        where: { id: params.id },
        data: {
          schengenManualRemainingDays: null,
          schengenManualAsOf: null,
        },
      });

      return NextResponse.json({ ok: true, cleared: true });
    }

    const parsedRemaining = Number(remainingDays);
    if (!Number.isFinite(parsedRemaining) || parsedRemaining < 0 || parsedRemaining > 90) {
      return NextResponse.json(
        { error: "Remaining days mora biti između 0 i 90" },
        { status: 400 }
      );
    }

    const asOf = asOfRaw ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      return NextResponse.json({ error: "Neispravan datum" }, { status: 400 });
    }

    await prisma.driver.update({
      where: { id: params.id },
      data: {
        schengenManualRemainingDays: Math.round(parsedRemaining),
        schengenManualAsOf: asOf,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Schengen override error:", error);
    return NextResponse.json(
      { error: error?.message || "Greška pri spremanju" },
      { status: 500 }
    );
  }
}
