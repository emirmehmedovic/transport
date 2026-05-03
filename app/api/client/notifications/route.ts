import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getClientToken(req: NextRequest) {
  const decoded = await getVerifiedAuthUserFromRequest(req);
  if (!decoded || decoded.role !== "CLIENT") return null;
  return decoded;
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await getClientToken(req);
    if (!decoded) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const notifications = await prisma.clientNotification.findMany({
      where: { userId: decoded.userId },
      include: {
        load: {
          select: {
            id: true,
            loadNumber: true,
            routeName: true,
            status: true,
            pickupCity: true,
            deliveryCity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((item) => !item.isRead).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching client notifications:", error);
    return NextResponse.json({ error: "Greška pri učitavanju obavijesti" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const decoded = await getClientToken(req);
    if (!decoded) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const markAll = Boolean(body?.markAll);

    if (!id && !markAll) {
      return NextResponse.json({ error: "Pošaljite id ili markAll" }, { status: 400 });
    }

    if (markAll) {
      await prisma.clientNotification.updateMany({
        where: {
          userId: decoded.userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    const existing = await prisma.clientNotification.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Obavijest nije pronađena" }, { status: 404 });
    }

    await prisma.clientNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client notifications:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju obavijesti" }, { status: 500 });
  }
}
