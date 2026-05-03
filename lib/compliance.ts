import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/mobile-push";

export const COMPLIANCE_THRESHOLDS = [30, 15, 7] as const;

export type ComplianceEntityType = "driver" | "truck" | "trailer";

export type ComplianceMissingItem = {
  entityId: string;
  entityType: ComplianceEntityType;
  entityLabel: string;
  missingItems: string[];
};

export type ComplianceExpiringItem = {
  entityId: string;
  entityType: ComplianceEntityType;
  entityLabel: string;
  itemLabel: string;
  expiryDate: Date;
  daysUntilExpiry: number;
};

function daysUntil(value: Date, now: Date) {
  return Math.ceil((value.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getComplianceSummary() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [drivers, trucks, trailers] = await Promise.all([
    prisma.driver.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        documents: {
          where: {
            type: {
              in: ["CDL_LICENSE", "MEDICAL_CARD"],
            },
          },
          select: {
            type: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: "asc",
        },
      },
    }),
    prisma.truck.findMany({
      where: { isActive: true },
      select: {
        id: true,
        truckNumber: true,
        registrationExpiry: true,
        insuranceExpiry: true,
      },
      orderBy: { truckNumber: "asc" },
    }),
    prisma.trailer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        trailerNumber: true,
        registrationExpiry: true,
        insuranceExpiry: true,
      },
      orderBy: { trailerNumber: "asc" },
    }),
  ]);

  const missing: ComplianceMissingItem[] = [];
  const expiring: ComplianceExpiringItem[] = [];

  for (const driver of drivers) {
    const missingItems: string[] = [];
    const cdlDoc = driver.documents.find((doc) => doc.type === "CDL_LICENSE");
    const medicalDoc = driver.documents.find((doc) => doc.type === "MEDICAL_CARD");
    const driverLabel = `${driver.user.firstName} ${driver.user.lastName}`;

    if (!cdlDoc) {
      missingItems.push("CDL licenca");
    }
    if (!medicalDoc) {
      missingItems.push("Medicinska kartica");
    }

    if (missingItems.length > 0) {
      missing.push({
        entityId: driver.id,
        entityType: "driver",
        entityLabel: driverLabel,
        missingItems,
      });
    }

    if (driver.cdlExpiry >= now && driver.cdlExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: driver.id,
        entityType: "driver",
        entityLabel: driverLabel,
        itemLabel: "CDL licenca",
        expiryDate: driver.cdlExpiry,
        daysUntilExpiry: daysUntil(driver.cdlExpiry, now),
      });
    }

    if (driver.medicalCardExpiry >= now && driver.medicalCardExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: driver.id,
        entityType: "driver",
        entityLabel: driverLabel,
        itemLabel: "Medicinska kartica",
        expiryDate: driver.medicalCardExpiry,
        daysUntilExpiry: daysUntil(driver.medicalCardExpiry, now),
      });
    }
  }

  for (const truck of trucks) {
    const missingItems: string[] = [];
    if (!truck.registrationExpiry) {
      missingItems.push("Registracija");
    }
    if (!truck.insuranceExpiry) {
      missingItems.push("Osiguranje");
    }
    if (missingItems.length > 0) {
      missing.push({
        entityId: truck.id,
        entityType: "truck",
        entityLabel: `Kamion ${truck.truckNumber}`,
        missingItems,
      });
    }

    if (truck.registrationExpiry >= now && truck.registrationExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: truck.id,
        entityType: "truck",
        entityLabel: `Kamion ${truck.truckNumber}`,
        itemLabel: "Registracija",
        expiryDate: truck.registrationExpiry,
        daysUntilExpiry: daysUntil(truck.registrationExpiry, now),
      });
    }

    if (truck.insuranceExpiry >= now && truck.insuranceExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: truck.id,
        entityType: "truck",
        entityLabel: `Kamion ${truck.truckNumber}`,
        itemLabel: "Osiguranje",
        expiryDate: truck.insuranceExpiry,
        daysUntilExpiry: daysUntil(truck.insuranceExpiry, now),
      });
    }
  }

  for (const trailer of trailers) {
    const missingItems: string[] = [];
    if (!trailer.registrationExpiry) {
      missingItems.push("Registracija");
    }
    if (!trailer.insuranceExpiry) {
      missingItems.push("Osiguranje");
    }
    if (missingItems.length > 0) {
      missing.push({
        entityId: trailer.id,
        entityType: "trailer",
        entityLabel: `Prikolica ${trailer.trailerNumber}`,
        missingItems,
      });
    }

    if (trailer.registrationExpiry && trailer.registrationExpiry >= now && trailer.registrationExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: trailer.id,
        entityType: "trailer",
        entityLabel: `Prikolica ${trailer.trailerNumber}`,
        itemLabel: "Registracija",
        expiryDate: trailer.registrationExpiry,
        daysUntilExpiry: daysUntil(trailer.registrationExpiry, now),
      });
    }

    if (trailer.insuranceExpiry && trailer.insuranceExpiry >= now && trailer.insuranceExpiry <= thirtyDaysFromNow) {
      expiring.push({
        entityId: trailer.id,
        entityType: "trailer",
        entityLabel: `Prikolica ${trailer.trailerNumber}`,
        itemLabel: "Osiguranje",
        expiryDate: trailer.insuranceExpiry,
        daysUntilExpiry: daysUntil(trailer.insuranceExpiry, now),
      });
    }
  }

  expiring.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

  return {
    summary: {
      totalMissing: missing.length,
      totalExpiring: expiring.length,
      driversMissing: missing.filter((item) => item.entityType === "driver").length,
      trucksMissing: missing.filter((item) => item.entityType === "truck").length,
      trailersMissing: missing.filter((item) => item.entityType === "trailer").length,
    },
    requiredByEntity: {
      driver: ["CDL licenca", "Medicinska kartica"],
      truck: ["Registracija", "Osiguranje"],
      trailer: ["Registracija", "Osiguranje"],
    },
    missing,
    expiring,
  };
}

export async function sendDriverComplianceReminderPush(
  userId: string,
  itemLabel: string,
  expiryDate: Date,
  daysRemaining: number
) {
  const formattedDate = expiryDate.toLocaleDateString("bs-BA");
  await sendPushToUser(userId, {
    title: "Podsjetnik za dokument",
    body: `${itemLabel} ističe ${formattedDate}. Preostalo: ${daysRemaining} dana.`,
    data: {
      type: "DRIVER_COMPLIANCE_REMINDER",
      itemLabel,
      expiryDate: expiryDate.toISOString(),
      daysRemaining,
    },
  });
}
