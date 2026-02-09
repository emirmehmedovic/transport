import { prisma } from "../lib/prisma";
import {
  sendAdminNotification,
  createComplianceExpiringNotification,
} from "../lib/telegram";

const COMPLIANCE_THRESHOLDS = new Set([30, 15, 7]);

const formatDate = (value: Date) =>
  value.toLocaleDateString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

async function sendComplianceAlerts() {
  const now = new Date();

  const drivers = await prisma.driver.findMany({
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  for (const driver of drivers) {
    if (driver.cdlExpiry) {
      const daysUntil = Math.ceil(
        (driver.cdlExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (COMPLIANCE_THRESHOLDS.has(daysUntil)) {
        await sendAdminNotification(
          createComplianceExpiringNotification({
            driverName: `${driver.user.firstName} ${driver.user.lastName}`,
            documentType: "CDL",
            expiryDate: formatDate(driver.cdlExpiry),
            daysUntilExpiry: daysUntil,
          })
        );
      }
    }

    if (driver.medicalCardExpiry) {
      const daysUntil = Math.ceil(
        (driver.medicalCardExpiry.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (COMPLIANCE_THRESHOLDS.has(daysUntil)) {
        await sendAdminNotification(
          createComplianceExpiringNotification({
            driverName: `${driver.user.firstName} ${driver.user.lastName}`,
            documentType: "Medical card",
            expiryDate: formatDate(driver.medicalCardExpiry),
            daysUntilExpiry: daysUntil,
          })
        );
      }
    }
  }

  const trucks = await prisma.truck.findMany({
    where: { isActive: true },
    select: {
      id: true,
      truckNumber: true,
      registrationExpiry: true,
      insuranceExpiry: true,
    },
  });

  for (const truck of trucks) {
    if (truck.registrationExpiry) {
      const daysUntil = Math.ceil(
        (truck.registrationExpiry.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (COMPLIANCE_THRESHOLDS.has(daysUntil)) {
        const message = [
          `${daysUntil <= 7 ? "🔴" : daysUntil <= 15 ? "⚠️" : "📋"} Registration ističe`,
          `🚛 Kamion: ${truck.truckNumber}`,
          `📅 Ističe: ${formatDate(truck.registrationExpiry)}`,
          `⏰ Preostalo: ${daysUntil} dana`,
        ].join("\n");
        await sendAdminNotification(message);
      }
    }

    if (truck.insuranceExpiry) {
      const daysUntil = Math.ceil(
        (truck.insuranceExpiry.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (COMPLIANCE_THRESHOLDS.has(daysUntil)) {
        const message = [
          `${daysUntil <= 7 ? "🔴" : daysUntil <= 15 ? "⚠️" : "📋"} Insurance ističe`,
          `🚛 Kamion: ${truck.truckNumber}`,
          `📅 Ističe: ${formatDate(truck.insuranceExpiry)}`,
          `⏰ Preostalo: ${daysUntil} dana`,
        ].join("\n");
        await sendAdminNotification(message);
      }
    }
  }
}

async function sendMaintenanceAlerts() {
  const records = await prisma.maintenanceRecord.findMany({
    where: {
      nextServiceDue: {
        not: null,
      },
    },
    include: {
      truck: {
        select: {
          truckNumber: true,
          currentMileage: true,
        },
      },
    },
  });

  for (const record of records) {
    if (!record.nextServiceDue || record.truck.currentMileage == null) {
      continue;
    }

    const kmTillDue = record.nextServiceDue - record.truck.currentMileage;
    if (kmTillDue > 500) {
      continue;
    }

    const isOverdue = kmTillDue <= 0;
    const message = [
      `${isOverdue ? "🔴 URGENT" : "⚠️"} Maintenance ${isOverdue ? "overdue" : "due soon"}`,
      `🚛 Kamion: ${record.truck.truckNumber}`,
      `🔧 Tip: ${record.type}`,
      `📊 Trenutna kilometraža: ${record.truck.currentMileage.toLocaleString()} km`,
      isOverdue
        ? `⚠️ Overdue: ${Math.abs(kmTillDue).toLocaleString()} km`
        : `⏰ Due za: ${kmTillDue.toLocaleString()} km`,
    ].join("\n");

    await sendAdminNotification(message);
  }
}

export async function runNotificationJobs() {
  try {
    await sendComplianceAlerts();
    await sendMaintenanceAlerts();
  } catch (error) {
    console.error("[Notifications] Error:", error);
    throw error;
  }
}

if (require.main === module) {
  runNotificationJobs()
    .then(() => {
      console.log("[Notifications] Completed");
    })
    .catch(() => {
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
