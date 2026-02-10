import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { isInSchengen } from "@/lib/schengen";
import {
  sendAdminNotification,
  sendTelegramNotification,
  createLoadAssignedNotification,
} from "@/lib/telegram";
import { formatDateTimeDMY } from "@/lib/date";

// PATCH /api/loads/[id]/assign - Dodjela drivera i trucka loadu
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
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json(
        { error: "Nemate dozvolu za ovu akciju" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { driverId, truckId } = body as {
      driverId?: string | null;
      truckId?: string | null;
    };

    const load = await prisma.load.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true,
        stops: {
          select: { latitude: true, longitude: true },
        },
        truck: {
          select: {
            id: true,
            maxSmallCars: true,
            maxMediumCars: true,
            maxLargeCars: true,
            maxOversized: true,
          },
        },
      },
    });

    if (!load) {
      return NextResponse.json(
        { error: "Load nije pronađen" },
        { status: 404 }
      );
    }

    // Osnovni capacity check ako se šalje truckId i postoje vehicles
    if (truckId && load.vehicles.length > 0) {
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        select: {
          id: true,
          maxSmallCars: true,
          maxMediumCars: true,
          maxLargeCars: true,
          maxOversized: true,
        },
      });

      if (!truck) {
        return NextResponse.json(
          { error: "Kamion nije pronađen" },
          { status: 404 }
        );
      }

      const counts = {
        SMALL: 0,
        MEDIUM: 0,
        LARGE: 0,
        OVERSIZED: 0,
      } as Record<string, number>;

      for (const v of load.vehicles) {
        counts[v.size] = (counts[v.size] || 0) + 1;
      }

      if (
        counts.SMALL > truck.maxSmallCars ||
        counts.MEDIUM > truck.maxMediumCars ||
        counts.LARGE > truck.maxLargeCars ||
        counts.OVERSIZED > truck.maxOversized
      ) {
        return NextResponse.json(
          { error: "Kapacitet kamiona nije dovoljan za ovaj load" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.load.update({
      where: { id: params.id },
      data: {
        driverId: driverId || null,
        truckId: truckId || null,
        status:
          driverId && truckId
            ? "ASSIGNED"
            : load.status === "AVAILABLE"
            ? "AVAILABLE"
            : load.status,
        assignedAt: driverId && truckId ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ASSIGNMENT",
        entity: "LOAD",
        entityId: updated.id,
        userId: decoded.userId,
      },
    });

    // Pošalji Telegram notifikaciju ako su driver i truck assignovani
    if (driverId && truckId) {
      try {
        // Fetchuj driver i truck podatke
        const assignedLoad = await prisma.load.findUnique({
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
            truck: {
              select: {
                truckNumber: true,
              },
            },
          },
        });

        if (assignedLoad && assignedLoad.driver && assignedLoad.truck) {
          const driverName = `${assignedLoad.driver.user.firstName} ${assignedLoad.driver.user.lastName}`;
          const message = createLoadAssignedNotification({
            loadNumber: assignedLoad.loadNumber,
            driverName,
            truckNumber: assignedLoad.truck.truckNumber || "N/A",
            pickupCity: assignedLoad.pickupCity,
            pickupState: assignedLoad.pickupState,
            deliveryCity: assignedLoad.deliveryCity,
            deliveryState: assignedLoad.deliveryState,
            scheduledPickupDate: formatDateTimeDMY(assignedLoad.scheduledPickupDate),
          });

          // Pošalji notifikaciju adminu
          await sendAdminNotification(message);

          // Pošalji notifikaciju vozaču ako ima telegram chat ID
          if (assignedLoad.driver.user.telegramChatId) {
            await sendTelegramNotification(
              assignedLoad.driver.user.telegramChatId,
              message
            );
          }
        }
      } catch (notifError) {
        // Ne blokiraj API ako notifikacija ne uspije
        console.error("Greška pri slanju Telegram notifikacije:", notifError);
      }
    }

    let warning: string | null = null;
    if (driverId) {
      const points = [
        { lat: load.pickupLatitude, lng: load.pickupLongitude },
        { lat: load.deliveryLatitude, lng: load.deliveryLongitude },
        ...(load.stops || []).map((s) => ({ lat: s.latitude, lng: s.longitude })),
      ].filter((p) => typeof p.lat === "number" && typeof p.lng === "number") as Array<{
        lat: number;
        lng: number;
      }>;

      const isSchengenLoad = points.some((p) => isInSchengen(p.lat, p.lng));

      if (isSchengenLoad) {
        const now = new Date();
        const windowFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: {
            schengenManualRemainingDays: true,
            schengenManualAsOf: true,
          },
        });

        if (driver) {
          const days = await prisma.schengenDay.findMany({
            where: {
              driverId,
              date: { gte: driver.schengenManualAsOf || windowFrom },
              inSchengen: true,
            },
            select: { date: true },
          });

          let remainingDays = 90 - days.length;
          if (driver.schengenManualRemainingDays !== null && driver.schengenManualAsOf) {
            remainingDays = Math.max(0, driver.schengenManualRemainingDays - days.length);
          } else {
            remainingDays = Math.max(0, remainingDays);
          }

          if (remainingDays < 7) {
            warning = `Upozorenje: vozaču je preostalo ${remainingDays} dana u Schengen 90/180.`;
          }
        }
      }
    }

    return NextResponse.json({ load: updated, warning });
  } catch (error: any) {
    console.error("Error assigning load:", error);
    return NextResponse.json(
      { error: "Greška pri dodjeli loada" },
      { status: 500 }
    );
  }
}
