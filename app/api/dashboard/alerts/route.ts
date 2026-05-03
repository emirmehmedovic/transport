import { NextRequest, NextResponse } from "next/server";
import { AppNotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type AlertType = "compliance" | "maintenance" | "documents" | "financial";
export type AlertUrgency = "urgent" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  urgency: AlertUrgency;
  title: string;
  description: string;
  entityId: string;
  entityType: "driver" | "truck" | "load" | "payStub";
  createdAt: Date;
  daysUntil?: number; // za expiring stvari
  acknowledgedAt?: Date;
  acknowledgedById?: string | null;
}

/**
 * GET /api/dashboard/alerts
 * Vraća sve aktivne alerte kategorizirane po urgentnosti
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const alerts: Alert[] = [];
    const now = new Date();

    // 1. COMPLIANCE ALERTS - Expiring Documents (30 dana)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // CDL Licenses expiring
    const driversWithExpiringCDL = await prisma.driver.findMany({
      where: {
        cdlExpiry: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const driver of driversWithExpiringCDL) {
      const daysUntil = Math.ceil(
        (new Date(driver.cdlExpiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `cdl-${driver.id}`,
        type: "compliance",
        urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
        title: "CDL License Expiring",
        description: `${driver.user.firstName} ${driver.user.lastName} - CDL ističe za ${daysUntil} dana`,
        entityId: driver.id,
        entityType: "driver",
        createdAt: now,
        daysUntil,
      });
    }

    // Medical Cards expiring
    const driversWithExpiringMedical = await prisma.driver.findMany({
      where: {
        medicalCardExpiry: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const driver of driversWithExpiringMedical) {
      const daysUntil = Math.ceil(
        (new Date(driver.medicalCardExpiry).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `medical-${driver.id}`,
        type: "compliance",
        urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
        title: "Medical Card Expiring",
        description: `${driver.user.firstName} ${driver.user.lastName} - Medical card ističe za ${daysUntil} dana`,
        entityId: driver.id,
        entityType: "driver",
        createdAt: now,
        daysUntil,
      });
    }

    // Truck Registration & Insurance expiring
    const trucksWithExpiringDocs = await prisma.truck.findMany({
      where: {
        OR: [
          {
            registrationExpiry: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
          {
            insuranceExpiry: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
        ],
        isActive: true,
      },
    });

    for (const truck of trucksWithExpiringDocs) {
      // Registration
      if (truck.registrationExpiry >= now && truck.registrationExpiry <= thirtyDaysFromNow) {
        const daysUntil = Math.ceil(
          (new Date(truck.registrationExpiry).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        alerts.push({
          id: `reg-${truck.id}`,
          type: "compliance",
          urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
          title: "Truck Registration Expiring",
          description: `Kamion ${truck.truckNumber} - Registracija ističe za ${daysUntil} dana`,
          entityId: truck.id,
          entityType: "truck",
          createdAt: now,
          daysUntil,
        });
      }

      // Insurance
      if (truck.insuranceExpiry >= now && truck.insuranceExpiry <= thirtyDaysFromNow) {
        const daysUntil = Math.ceil(
          (new Date(truck.insuranceExpiry).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        alerts.push({
          id: `ins-${truck.id}`,
          type: "compliance",
          urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
          title: "Truck Insurance Expiring",
          description: `Kamion ${truck.truckNumber} - Insurance ističe za ${daysUntil} dana`,
          entityId: truck.id,
          entityType: "truck",
          createdAt: now,
          daysUntil,
        });
      }
    }

    const trailersWithExpiringDocs = await prisma.trailer.findMany({
      where: {
        OR: [
          {
            registrationExpiry: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
          {
            insuranceExpiry: {
              lte: thirtyDaysFromNow,
              gte: now,
            },
          },
        ],
        isActive: true,
      },
    });

    for (const trailer of trailersWithExpiringDocs) {
      if (trailer.registrationExpiry && trailer.registrationExpiry >= now && trailer.registrationExpiry <= thirtyDaysFromNow) {
        const daysUntil = Math.ceil(
          (new Date(trailer.registrationExpiry).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        alerts.push({
          id: `trailer-reg-${trailer.id}`,
          type: "compliance",
          urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
          title: "Trailer Registration Expiring",
          description: `Prikolica ${trailer.trailerNumber} - Registracija ističe za ${daysUntil} dana`,
          entityId: trailer.id,
          entityType: "truck",
          createdAt: now,
          daysUntil,
        });
      }

      if (trailer.insuranceExpiry && trailer.insuranceExpiry >= now && trailer.insuranceExpiry <= thirtyDaysFromNow) {
        const daysUntil = Math.ceil(
          (new Date(trailer.insuranceExpiry).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        alerts.push({
          id: `trailer-ins-${trailer.id}`,
          type: "compliance",
          urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
          title: "Trailer Insurance Expiring",
          description: `Prikolica ${trailer.trailerNumber} - Osiguranje ističe za ${daysUntil} dana`,
          entityId: trailer.id,
          entityType: "truck",
          createdAt: now,
          daysUntil,
        });
      }
    }

    // 2. MAINTENANCE ALERTS - Due within 500 km
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: {
        nextServiceDue: {
          not: null,
        },
      },
      include: {
        truck: {
          select: {
            id: true,
            truckNumber: true,
            currentMileage: true,
          },
        },
      },
    });

    for (const record of maintenanceRecords) {
      if (record.nextServiceDue && record.truck.currentMileage) {
        const kmTillDue = record.nextServiceDue - record.truck.currentMileage;

        if (kmTillDue <= 500) {
          alerts.push({
            id: `maint-${record.id}`,
            type: "maintenance",
            urgency: kmTillDue <= 0 ? "urgent" : kmTillDue <= 200 ? "warning" : "info",
            title: kmTillDue <= 0 ? "Maintenance Overdue" : "Maintenance Due Soon",
            description: `Kamion ${record.truck.truckNumber} - ${record.type} ${
              kmTillDue <= 0 ? `overdue ${Math.abs(kmTillDue)} km` : `za ${kmTillDue} km`
            }`,
            entityId: record.truck.id,
            entityType: "truck",
            createdAt: now,
          });
        }
      }
    }

    // 3. TOLL/PERMIT ALERTS - Expiring permits (30 dana)
    const tollPermitsExpiring = await prisma.tollPermit.findMany({
      where: {
        validTo: {
          lte: thirtyDaysFromNow,
          gte: now,
        },
      },
      include: {
        truck: {
          select: {
            id: true,
            truckNumber: true,
          },
        },
      },
    });

    for (const permit of tollPermitsExpiring) {
      const daysUntil = Math.ceil(
        (new Date(permit.validTo).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `toll-${permit.id}`,
        type: "compliance",
        urgency: daysUntil <= 7 ? "urgent" : daysUntil <= 15 ? "warning" : "info",
        title: "Toll/Permit Expiring",
        description: `Kamion ${permit.truck?.truckNumber || ""} - ${permit.countryCode} ${
          permit.type
        } ističe za ${daysUntil} dana`,
        entityId: permit.truck?.id || permit.id,
        entityType: "truck",
        createdAt: now,
        daysUntil,
      });
    }

    // 4. DOCUMENTS ALERTS - Loads missing POD (>24h after delivery)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const loadsWithoutPOD = await prisma.load.findMany({
      where: {
        status: {
          in: ["DELIVERED", "COMPLETED"],
        },
        actualDeliveryDate: {
          lte: twentyFourHoursAgo,
        },
      },
      include: {
        documents: {
          where: {
            type: "POD",
          },
        },
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    for (const load of loadsWithoutPOD) {
      if (load.documents.length === 0) {
        const hoursSinceDelivery = load.actualDeliveryDate
          ? Math.ceil(
              (now.getTime() - new Date(load.actualDeliveryDate).getTime()) /
                (1000 * 60 * 60)
            )
          : 0;

        const driverName = load.driver
          ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
          : "Unknown";

        alerts.push({
          id: `pod-${load.id}`,
          type: "documents",
          urgency: hoursSinceDelivery > 48 ? "urgent" : "warning",
          title: "Missing POD",
          description: `Load ${load.loadNumber} (${driverName}) - POD nedostaje ${hoursSinceDelivery}h`,
          entityId: load.id,
          entityType: "load",
          createdAt: now,
        });
      }
    }

    // 5. BORDER CONFIRMATION ALERTS - Driver confirmation pending
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const borderConfirmationsPending = await prisma.appNotification.findMany({
      where: {
        requiresConfirmation: true,
        confirmedAt: null,
        createdAt: {
          lte: sixHoursAgo,
        },
        type: {
          in: [
            AppNotificationType.DRIVER_BORDER_EXIT_EU,
            AppNotificationType.DRIVER_BORDER_RETURN_BIH,
          ],
        },
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        data: true,
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    for (const notification of borderConfirmationsPending) {
      if (!notification.driver) continue;

      const hoursPending = Math.ceil(
        (now.getTime() - notification.createdAt.getTime()) / (1000 * 60 * 60)
      );

      const data =
        notification.data &&
        typeof notification.data === "object" &&
        !Array.isArray(notification.data)
          ? (notification.data as Prisma.JsonObject)
          : null;

      const crossingName =
        typeof data?.borderCrossingName === "string" ? data.borderCrossingName : null;

      alerts.push({
        id: `border-confirm-${notification.id}`,
        type: "compliance",
        urgency: hoursPending >= 12 ? "urgent" : "warning",
        title:
          notification.type === AppNotificationType.DRIVER_BORDER_EXIT_EU
            ? "Čeka potvrda izlaska u EU"
            : "Čeka potvrda povratka u BiH",
        description: `${notification.driver.user.firstName} ${notification.driver.user.lastName} nije potvrdio border događaj ${hoursPending}h${crossingName ? ` • ${crossingName}` : ""}`,
        entityId: notification.driver.id,
        entityType: "driver",
        createdAt: notification.createdAt,
      });
    }

    // 6. FINANCIAL ALERTS - Unpaid Pay Stubs (>30 days old)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unpaidStubs = await prisma.payStub.findMany({
      where: {
        isPaid: false,
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    for (const stub of unpaidStubs) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(stub.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        id: `paystub-${stub.id}`,
        type: "financial",
        urgency: daysOverdue > 60 ? "urgent" : daysOverdue > 45 ? "warning" : "info",
        title: "Unpaid Pay Stub",
        description: `${stub.driver.user.firstName} ${stub.driver.user.lastName} - Pay stub ${stub.stubNumber} neplaćen ${daysOverdue} dana`,
        entityId: stub.id,
        entityType: "payStub",
        createdAt: now,
      });
    }

    // Sort by urgency (urgent first), then by days/priority
    const urgencyOrder = { urgent: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => {
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      // Within same urgency, sort by daysUntil (ascending)
      if (a.daysUntil !== undefined && b.daysUntil !== undefined) {
        return a.daysUntil - b.daysUntil;
      }
      return 0;
    });

    // Breakdown by urgency
    const breakdown = {
      urgent: alerts.filter((a) => a.urgency === "urgent").length,
      warning: alerts.filter((a) => a.urgency === "warning").length,
      info: alerts.filter((a) => a.urgency === "info").length,
    };

    const includeAcknowledged =
      request.nextUrl.searchParams.get("includeAcknowledged") === "1";

    if (alerts.length > 0) {
      const acknowledgements = await prisma.alertAcknowledgement.findMany({
        where: {
          alertId: {
            in: alerts.map((a) => a.id),
          },
        },
        select: {
          alertId: true,
          acknowledgedAt: true,
          acknowledgedById: true,
        },
      });

      const ackMap = new Map(
        acknowledgements.map((ack) => [ack.alertId, ack])
      );

      alerts.forEach((alert) => {
        const ack = ackMap.get(alert.id);
        if (ack) {
          alert.acknowledgedAt = ack.acknowledgedAt;
          alert.acknowledgedById = ack.acknowledgedById;
        }
      });

      if (!includeAcknowledged) {
        const filtered = alerts.filter((alert) => !ackMap.has(alert.id));
        alerts.length = 0;
        alerts.push(...filtered);
      }
    }

    return NextResponse.json({
      total: alerts.length,
      breakdown: {
        urgent: alerts.filter((a) => a.urgency === "urgent").length,
        warning: alerts.filter((a) => a.urgency === "warning").length,
        info: alerts.filter((a) => a.urgency === "info").length,
      },
      alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
