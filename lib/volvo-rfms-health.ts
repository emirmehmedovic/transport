import { DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";
import { isVolvoRfmsConfigured } from "@/lib/volvo-rfms";
import { buildVolvoRfmsOverview, getVolvoRfmsConfig } from "@/lib/volvo-rfms-sync";

const VOLVO_RFMS_HEALTH_STATE_KEY = "volvo_rfms_health_state";
const VOLVO_STALE_ALERT_RECIPIENTS = ["emir.m@live.com"];
const STALE_THRESHOLD_MINUTES = 30;
const LOCAL_LAG_ALERT_MINUTES = 10;

type VolvoRfmsHealthState = {
  activeAlertDriverIds: string[];
  lastSentAt: string | null;
  lastResolvedAt: string | null;
};

type VolvoStaleDriver = {
  driverId: string;
  driverName: string;
  email: string | null;
  truckNumber: string | null;
  vin: string | null;
  apiPositionAt: Date;
  lastLocationUpdate: Date | null;
  lastKnownLatitude: number | null;
  lastKnownLongitude: number | null;
  apiFreshMinutes: number;
  localLagMinutes: number;
};

const DEFAULT_STATE: VolvoRfmsHealthState = {
  activeAlertDriverIds: [],
  lastSentAt: null,
  lastResolvedAt: null,
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value: Date | null) {
  if (!value) return "Nema zabilježene pozicije";
  return value.toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getHealthState(): Promise<VolvoRfmsHealthState> {
  const setting = await prisma.setting.findUnique({
    where: { key: VOLVO_RFMS_HEALTH_STATE_KEY },
    select: { value: true },
  });

  if (!setting) return DEFAULT_STATE;

  try {
    const parsed = JSON.parse(setting.value) as Partial<VolvoRfmsHealthState>;
    return {
      activeAlertDriverIds: Array.isArray(parsed.activeAlertDriverIds)
        ? parsed.activeAlertDriverIds.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [],
      lastSentAt: typeof parsed.lastSentAt === "string" && parsed.lastSentAt.length > 0 ? parsed.lastSentAt : null,
      lastResolvedAt:
        typeof parsed.lastResolvedAt === "string" && parsed.lastResolvedAt.length > 0
          ? parsed.lastResolvedAt
          : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveHealthState(state: VolvoRfmsHealthState) {
  await prisma.setting.upsert({
    where: { key: VOLVO_RFMS_HEALTH_STATE_KEY },
    update: { value: JSON.stringify(state) },
    create: { key: VOLVO_RFMS_HEALTH_STATE_KEY, value: JSON.stringify(state) },
  });
}

async function getStaleVolvoDrivers(): Promise<VolvoStaleDriver[]> {
  const config = await getVolvoRfmsConfig();
  const monitoredDriverIds = Object.entries(config.driverSources)
    .filter(([, source]) => source === "VOLVO_RFMS")
    .map(([driverId]) => driverId);

  if (monitoredDriverIds.length === 0) {
    return [];
  }

  const now = Date.now();
  const [drivers, overview] = await Promise.all([
    prisma.driver.findMany({
      where: {
        id: { in: monitoredDriverIds },
        status: DriverStatus.ACTIVE,
        primaryTruck: {
          is: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        lastLocationUpdate: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        primaryTruck: {
          select: {
            truckNumber: true,
            vin: true,
          },
        },
      },
    }),
    buildVolvoRfmsOverview(),
  ]);

  const latestByDriverId = new Map(
    overview.mappings
      .filter((row) => row.driverId && row.latestPosition?.positionDateTime)
      .map((row) => [row.driverId!, row.latestPosition!])
  );

  const candidates: Array<VolvoStaleDriver | null> = drivers.map((driver) => {
      const latestApiPosition = latestByDriverId.get(driver.id);
      if (!latestApiPosition?.positionDateTime) {
        return null;
      }

      const apiPositionAt = new Date(latestApiPosition.positionDateTime);
      const apiFreshMinutes = Math.floor((now - apiPositionAt.getTime()) / 60000);
      const localLagMinutes = driver.lastLocationUpdate
        ? Math.floor((apiPositionAt.getTime() - driver.lastLocationUpdate.getTime()) / 60000)
        : Number.POSITIVE_INFINITY;

      const staleDriver: VolvoStaleDriver = {
        driverId: driver.id,
        driverName: `${driver.user.firstName} ${driver.user.lastName}`.trim(),
        email: driver.user.email,
        truckNumber: driver.primaryTruck?.truckNumber ?? null,
        vin: driver.primaryTruck?.vin ?? null,
        apiPositionAt,
        lastLocationUpdate: driver.lastLocationUpdate,
        lastKnownLatitude: driver.lastKnownLatitude,
        lastKnownLongitude: driver.lastKnownLongitude,
        apiFreshMinutes,
        localLagMinutes,
      };

      return staleDriver;
    });

  return candidates
    .filter((driver): driver is VolvoStaleDriver => driver !== null)
    .filter(
      (driver) =>
        driver.apiFreshMinutes <= STALE_THRESHOLD_MINUTES &&
        driver.localLagMinutes >= LOCAL_LAG_ALERT_MINUTES
    )
    .sort((a, b) => b.localLagMinutes - a.localLagMinutes);
}

function buildAlertHtml(drivers: VolvoStaleDriver[]) {
  const generatedAt = new Date();
  const rows = drivers
    .map((driver) => {
      const location =
        typeof driver.lastKnownLatitude === "number" && typeof driver.lastKnownLongitude === "number"
          ? `${driver.lastKnownLatitude.toFixed(5)}, ${driver.lastKnownLongitude.toFixed(5)}`
          : "Nema koordinata";

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#111827;">${escapeHtml(driver.driverName)}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#374151;">${escapeHtml(driver.truckNumber || "—")}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#374151;">${escapeHtml(driver.email || "—")}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#b91c1c;font-weight:700;">${Number.isFinite(driver.localLagMinutes) ? `${driver.localLagMinutes} min` : "Nema nikad"}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#374151;">${escapeHtml(formatDateTime(driver.apiPositionAt))}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#374151;">${escapeHtml(formatDateTime(driver.lastLocationUpdate))}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;font:14px/1.4 Arial,sans-serif;color:#374151;">${escapeHtml(location)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="margin:0;padding:24px;background:#f3f4f6;">
      <div style="max-width:900px;margin:0 auto;background:#ffffff;border:1px solid #d1d5db;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 24px;background:#e5e7eb;border-bottom:1px solid #d1d5db;">
          <div style="font:700 22px/1.2 Arial,sans-serif;color:#1e3a8a;">Volvo alert</div>
          <div style="margin-top:6px;font:14px/1.5 Arial,sans-serif;color:#374151;">
            Volvo API ima svježiju poziciju od naše lokalne evidencije za jedan ili više vozača.
          </div>
        </div>
        <div style="padding:20px 24px;">
          <div style="margin-bottom:16px;font:14px/1.5 Arial,sans-serif;color:#374151;">
            Generisano: <strong>${escapeHtml(formatDateTime(generatedAt))}</strong><br/>
            Broj pogođenih vozača: <strong>${drivers.length}</strong>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Vozač</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Kamion</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Email</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Lokalni lag</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">API pozicija</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Lokalna pozicija</th>
                <th align="left" style="padding:12px;border-bottom:1px solid #e5e7eb;font:700 12px/1.4 Arial,sans-serif;color:#1f2937;text-transform:uppercase;">Koordinate</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export async function runVolvoRfmsStaleAlertCheck() {
  const config = await getVolvoRfmsConfig();
  if (!config.enabled || !isVolvoRfmsConfigured()) {
    return { sent: false, staleDrivers: 0, reason: "disabled" as const };
  }

  const state = await getHealthState();
  const staleDrivers = await getStaleVolvoDrivers();
  const staleIds = staleDrivers.map((driver) => driver.driverId).sort();
  const previousIds = [...state.activeAlertDriverIds].sort();
  const unchanged =
    staleIds.length === previousIds.length &&
    staleIds.every((value, index) => value === previousIds[index]);

  if (staleIds.length === 0) {
    if (state.activeAlertDriverIds.length > 0) {
      await saveHealthState({
        activeAlertDriverIds: [],
        lastSentAt: state.lastSentAt,
        lastResolvedAt: new Date().toISOString(),
      });
    }
    return { sent: false, staleDrivers: 0, reason: "clear" as const };
  }

  if (unchanged) {
    return { sent: false, staleDrivers: staleDrivers.length, reason: "unchanged" as const };
  }

  await sendHtmlEmail({
    to: VOLVO_STALE_ALERT_RECIPIENTS,
    subject: `Volvo alert: ${staleDrivers.length} vozila bez svježe pozicije`,
    html: buildAlertHtml(staleDrivers),
  });

  await saveHealthState({
    activeAlertDriverIds: staleIds,
    lastSentAt: new Date().toISOString(),
    lastResolvedAt: state.lastResolvedAt,
  });

  return { sent: true, staleDrivers: staleDrivers.length, reason: "sent" as const };
}
