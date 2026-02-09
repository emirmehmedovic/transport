import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  sendAdminNotification,
  sendTelegramNotification,
  createLoadStatusChangedNotification,
} from "@/lib/telegram";

const ALLOWED_STATUSES = [
  "AVAILABLE",
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

type LoadStatus = (typeof ALLOWED_STATUSES)[number];

// Definicija dozvoljenih prijelaza statusa
const STATUS_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  AVAILABLE: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  ACCEPTED: ["PICKED_UP", "CANCELLED"], // Legacy support
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

// PATCH /api/loads/[id]/status - Promjena statusa loada
export async function PATCH(
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
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { status } = body as { status?: LoadStatus };

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Nevažeći status" },
        { status: 400 }
      );
    }

    const load = await prisma.load.findUnique({ where: { id: params.id } });

    if (!load) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    // Driver može mijenjati status samo svojih loadova
    if (decoded.role === "DRIVER" && load.driverId !== decoded.driverId) {
      return NextResponse.json(
        { error: "Nemate dozvolu da mijenjate status ovog loada" },
        { status: 403 }
      );
    }

    const currentStatus = load.status as LoadStatus;
    const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(status)) {
      return NextResponse.json(
        { error: "Nevažeća promjena statusa za trenutni workflow" },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (status === "ASSIGNED" && !load.assignedAt) {
      updateData.assignedAt = new Date();
    }
    if (status === "IN_TRANSIT") {
      updateData.inTransitAt = new Date();
    }
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.load.update({
      where: { id: params.id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: "STATUS_CHANGE",
        entity: "LOAD",
        entityId: updated.id,
        userId: decoded.userId,
      },
    });

    // Pošalji Telegram notifikaciju za promjenu statusa
    try {
      const loadWithDriver = await prisma.load.findUnique({
        where: { id: updated.id },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telegramChatId: true,
                },
              },
            },
          },
        },
      });

      if (loadWithDriver && loadWithDriver.driver) {
        const driverName = `${loadWithDriver.driver.user.firstName} ${loadWithDriver.driver.user.lastName}`;
        const location = `${loadWithDriver.pickupCity}, ${loadWithDriver.pickupState} → ${loadWithDriver.deliveryCity}, ${loadWithDriver.deliveryState}`;

        const message = createLoadStatusChangedNotification({
          loadNumber: loadWithDriver.loadNumber,
          driverName,
          oldStatus: currentStatus,
          newStatus: status,
          location,
        });

        // Pošalji notifikaciju adminu
        await sendAdminNotification(message);

        // Pošalji notifikaciju vozaču ako ima telegram chat ID
        if (loadWithDriver.driver.user.telegramChatId) {
          await sendTelegramNotification(
            loadWithDriver.driver.user.telegramChatId,
            message
          );
        }
      }
    } catch (notifError) {
      // Ne blokiraj API ako notifikacija ne uspije
      console.error("Greška pri slanju Telegram notifikacije:", notifError);
    }

    return NextResponse.json({ load: updated });
  } catch (error: any) {
    console.error("Error updating load status:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju statusa loada" },
      { status: 500 }
    );
  }
}
