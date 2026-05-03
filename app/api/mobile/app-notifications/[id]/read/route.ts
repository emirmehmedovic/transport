import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const existing = await prisma.appNotification.findFirst({
      where: {
        id: params.id,
        userId: decoded.userId,
      },
      select: {
        id: true,
        readAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Notifikacija nije pronađena" }, { status: 404 });
    }

    if (existing.readAt) {
      return NextResponse.json({ success: true, alreadyRead: true });
    }

    await prisma.appNotification.update({
      where: { id: existing.id },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Read app notification error:", error);
    return NextResponse.json(
      { error: "Greška pri označavanju notifikacije" },
      { status: 500 }
    );
  }
}
