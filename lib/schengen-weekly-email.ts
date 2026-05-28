import { AppNotificationType, DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";
import { getSchengenSummaryRows } from "@/lib/schengen-summary";
import { detectBorderCrossings, getNearestBorderCrossing } from "@/lib/schengen-border";

export const SCHENGEN_WEEKLY_REPORT_SETTING_KEY = "schengen_weekly_report_config";
export const SCHENGEN_WEEKLY_REPORT_HISTORY_SETTING_KEY = "schengen_weekly_report_history";

export type SchengenWeeklyReportConfig = {
  enabled: boolean;
  recipients: string[];
};

export type SchengenWeeklyReportHistoryEntry = {
  id: string;
  triggeredAt: string;
  trigger: "manual" | "cron";
  triggeredByName: string | null;
  recipients: string[];
  success: boolean;
  reason: string | null;
  driverCount: number;
  criticalCount: number;
};

const DEFAULT_CONFIG: SchengenWeeklyReportConfig = {
  enabled: false,
  recipients: [],
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value: Date) {
  return value.toLocaleString("bs-BA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: DriverStatus) {
  switch (status) {
    case DriverStatus.ACTIVE:
      return "Aktivan";
    case DriverStatus.VACATION:
      return "Odmor";
    case DriverStatus.SICK_LEAVE:
      return "Bolovanje";
    case DriverStatus.INACTIVE:
      return "Neaktivan";
    default:
      return status;
  }
}

function getCrossingTypeLabel(type: AppNotificationType) {
  switch (type) {
    case AppNotificationType.DRIVER_BORDER_EXIT_EU:
      return "Izašao iz BiH";
    case AppNotificationType.DRIVER_BORDER_RETURN_BIH:
      return "Ušao u BiH";
    default:
      return type;
  }
}

type WeeklyBorderCrossing = {
  crossingAt: string;
  borderCrossingName: string | null;
  type: AppNotificationType;
  confirmedAt: string | null;
};

async function getWeeklyBorderCrossingsByDriver(driverIds: string[]) {
  if (driverIds.length === 0) {
    return new Map<string, WeeklyBorderCrossing[]>();
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [positions, borderZones, notifications] = await Promise.all([
    prisma.position.findMany({
      where: {
        driverId: { in: driverIds },
        recordedAt: { gte: since },
      },
      select: {
        driverId: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        recordedAt: true,
      },
      orderBy: [{ driverId: "asc" }, { recordedAt: "asc" }],
    }),
    prisma.zone.findMany({
      where: {
        isActive: true,
        type: "BORDER_CROSSING",
      },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLon: true,
      },
    }),
    prisma.appNotification.findMany({
      where: {
        driverId: { in: driverIds },
        type: {
          in: [
            AppNotificationType.DRIVER_BORDER_EXIT_EU,
            AppNotificationType.DRIVER_BORDER_RETURN_BIH,
          ],
        },
        createdAt: { gte: since },
      },
      select: {
        driverId: true,
        confirmedAt: true,
        data: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const notificationsByCrossing = new Map<string, { confirmedAt: string | null }>();
  for (const notification of notifications) {
    if (!notification.driverId) continue;
    const payload =
      notification.data && typeof notification.data === "object" && !Array.isArray(notification.data)
        ? (notification.data as Record<string, unknown>)
        : null;
    const crossingAt =
      typeof payload?.crossingAt === "string" ? payload.crossingAt : null;
    const crossingType =
      typeof payload?.crossingType === "string" ? payload.crossingType : null;
    if (!crossingAt || !crossingType) continue;
    const key = `${notification.driverId}:${crossingType}:${crossingAt}`;
    if (notificationsByCrossing.has(key)) continue;
    notificationsByCrossing.set(key, {
      confirmedAt: notification.confirmedAt?.toISOString() ?? null,
    });
  }

  const positionsByDriver = new Map<
    string,
    Array<{ latitude: number; longitude: number; accuracy: number | null; recordedAt: Date }>
  >();
  for (const position of positions) {
    if (!position.driverId) {
      continue;
    }

    const bucket = positionsByDriver.get(position.driverId) ?? [];
    bucket.push({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      recordedAt: position.recordedAt,
    });
    positionsByDriver.set(position.driverId, bucket);
  }

  const byDriver = new Map<string, WeeklyBorderCrossing[]>();
  for (const driverId of driverIds) {
    const transitions = positionsByDriver.get(driverId) ?? [];
    if (transitions.length === 0) {
      byDriver.set(driverId, []);
      continue;
    }

    const crossings = detectBorderCrossings(transitions)
      .map((crossing) => {
        const nearest = getNearestBorderCrossing(crossing, borderZones);
        const key = `${driverId}:${crossing.type}:${crossing.recordedAt}`;
        const notification = notificationsByCrossing.get(key);

        return {
          crossingAt: crossing.recordedAt,
          borderCrossingName: nearest?.name ?? null,
          type:
            crossing.type === "EXIT_BIH"
              ? AppNotificationType.DRIVER_BORDER_EXIT_EU
              : AppNotificationType.DRIVER_BORDER_RETURN_BIH,
          confirmedAt: notification?.confirmedAt ?? null,
        } satisfies WeeklyBorderCrossing;
      })
      .sort(
        (a, b) => new Date(b.crossingAt).getTime() - new Date(a.crossingAt).getTime()
      );

    byDriver.set(driverId, crossings);
  }

  return byDriver;
}

export async function getSchengenWeeklyReportHistory(): Promise<SchengenWeeklyReportHistoryEntry[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: SCHENGEN_WEEKLY_REPORT_HISTORY_SETTING_KEY },
    select: { value: true },
  });

  if (!setting) {
    return [];
  }

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is SchengenWeeklyReportHistoryEntry => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.triggeredAt === "string" &&
          (item.trigger === "manual" || item.trigger === "cron") &&
          Array.isArray(item.recipients) &&
          typeof item.success === "boolean"
        );
      })
      .slice(0, 20);
  } catch {
    return [];
  }
}

async function appendSchengenWeeklyReportHistory(entry: SchengenWeeklyReportHistoryEntry) {
  const existing = await getSchengenWeeklyReportHistory();
  const next = [entry, ...existing].slice(0, 20);

  await prisma.setting.upsert({
    where: { key: SCHENGEN_WEEKLY_REPORT_HISTORY_SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: {
      key: SCHENGEN_WEEKLY_REPORT_HISTORY_SETTING_KEY,
      value: JSON.stringify(next),
    },
  });
}

export async function getSchengenWeeklyReportConfig(): Promise<SchengenWeeklyReportConfig> {
  const setting = await prisma.setting.findUnique({
    where: { key: SCHENGEN_WEEKLY_REPORT_SETTING_KEY },
    select: { value: true },
  });

  if (!setting) {
    return DEFAULT_CONFIG;
  }

  try {
    const parsed = JSON.parse(setting.value) as Partial<SchengenWeeklyReportConfig>;
    const recipients = Array.isArray(parsed.recipients)
      ? parsed.recipients
          .map((recipient) => String(recipient).trim())
          .filter((recipient) => recipient.length > 0)
      : [];

    return {
      enabled: parsed.enabled === true,
      recipients,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveSchengenWeeklyReportConfig(config: SchengenWeeklyReportConfig) {
  const normalizedRecipients = Array.from(
    new Set(
      config.recipients
        .map((recipient) => recipient.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const invalidRecipients = normalizedRecipients.filter((recipient) => !isValidEmail(recipient));
  if (invalidRecipients.length > 0) {
    throw new Error(`Neispravne email adrese: ${invalidRecipients.join(", ")}`);
  }

  const value = JSON.stringify({
    enabled: config.enabled,
    recipients: normalizedRecipients,
  });

  await prisma.setting.upsert({
    where: { key: SCHENGEN_WEEKLY_REPORT_SETTING_KEY },
    update: { value },
    create: {
      key: SCHENGEN_WEEKLY_REPORT_SETTING_KEY,
      value,
    },
  });

  return {
    enabled: config.enabled,
    recipients: normalizedRecipients,
  };
}

function buildWeeklySchengenReportHtml(params: {
  generatedAt: string;
  rows: Awaited<ReturnType<typeof getSchengenSummaryRows>>["drivers"];
  borderCrossingsByDriver: Map<string, WeeklyBorderCrossing[]>;
}) {
  const generatedAt = formatDateTime(new Date(params.generatedAt));
  const criticalCount = params.rows.filter((row) => row.remainingDays <= 7).length;
  const warningCount = params.rows.filter(
    (row) => row.remainingDays > 7 && row.remainingDays <= 14
  ).length;

  const driverCardsHtml = params.rows
    .map((row, index) => {
      const remainingColor =
        row.remainingDays <= 3
          ? "#dc2626"
          : row.remainingDays <= 7
            ? "#d97706"
            : row.remainingDays <= 14
              ? "#b45309"
              : "#166534";
      const remainingBackground =
        row.remainingDays <= 3
          ? "#fef2f2"
          : row.remainingDays <= 7
            ? "#fff7ed"
            : row.remainingDays <= 14
              ? "#fffbeb"
              : "#f0fdf4";
      const progressWidth = Math.max(4, Math.min((row.remainingDays / 90) * 100, 100));

      return `
        <div style="border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;padding:16px 16px 14px;margin-top:${index === 0 ? "0" : "12px"};">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
              <div style="font-size:12px;color:#64748b;font-weight:700;">#${index + 1}</div>
              <div style="margin-top:4px;font-size:17px;line-height:1.3;font-weight:800;color:#0f172a;">${escapeHtml(row.name)}</div>
              <div style="margin-top:4px;font-size:12px;color:#64748b;">${escapeHtml(row.email)}</div>
            </div>
            <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:${remainingBackground};color:${remainingColor};font-weight:800;font-size:14px;">
              Preostalo ${row.remainingDays}
            </div>
          </div>

          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px;font-weight:700;">Status: ${escapeHtml(getStatusLabel(row.status))}</span>
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px;font-weight:700;">Kamion: ${escapeHtml(row.truckNumber || "-")}</span>
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px;font-weight:700;">Reset: ${row.nextResetAt ? escapeHtml(new Date(row.nextResetAt).toLocaleDateString("bs-BA")) : "-"}</span>
          </div>

          <div style="margin-top:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <div style="font-size:12px;font-weight:700;color:#475569;">Iskorišteno</div>
              <div style="font-size:14px;font-weight:800;color:#334155;">${row.usedDays} / 90</div>
            </div>
            <div style="margin-top:6px;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
              <div style="height:8px;width:${Math.max(4, Math.min((row.usedDays / 90) * 100, 100))}%;background:#475569;border-radius:999px;"></div>
            </div>
          </div>

          <div style="margin-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <div style="font-size:12px;font-weight:700;color:#475569;">Preostalo</div>
              <div style="font-size:14px;font-weight:800;color:${remainingColor};">${row.remainingDays} / 90</div>
            </div>
            <div style="margin-top:6px;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
              <div style="height:8px;width:${progressWidth}%;background:${remainingColor};border-radius:999px;"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const detailsHtml = params.rows
    .map((row) => {
      const crossings = params.borderCrossingsByDriver.get(row.driverId) ?? [];
      const content =
        crossings.length === 0
          ? `<div style="padding:0 16px 16px;color:#64748b;font-size:13px;">Nema zabilježenih prelazaka u zadnjih 7 dana.</div>`
          : `<div style="padding:0 16px 16px;">
              ${crossings
                .map((crossing) => {
                  const confirmationLabel = crossing.confirmedAt
                    ? `Potvrđeno ${escapeHtml(formatDateTime(new Date(crossing.confirmedAt)))}`
                    : "Čeka potvrdu";
                  const directionLabel =
                    crossing.type === AppNotificationType.DRIVER_BORDER_EXIT_EU
                      ? "Izlazak prema Schengenu"
                      : "Povratak u BiH";
                  const directionBg =
                    crossing.type === AppNotificationType.DRIVER_BORDER_EXIT_EU
                      ? "#fef2f2"
                      : "#f0fdf4";
                  const directionColor =
                    crossing.type === AppNotificationType.DRIVER_BORDER_EXIT_EU
                      ? "#b91c1c"
                      : "#166534";

                  return `
                    <div style="padding:12px 0;border-top:1px solid #e2e8f0;font-size:13px;">
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${directionBg};color:${directionColor};font-weight:700;">${escapeHtml(directionLabel)}</span>
                        <span style="font-weight:600;color:#0f172a;">${escapeHtml(formatDateTime(new Date(crossing.crossingAt)))}</span>
                      </div>
                      <div style="margin-top:6px;color:#334155;">${crossing.borderCrossingName ? `Prelaz: ${escapeHtml(crossing.borderCrossingName)}` : "Prelaz nije imenovan"}</div>
                      <div style="margin-top:4px;color:#64748b;">${escapeHtml(confirmationLabel)}</div>
                    </div>
                  `;
                })
                .join("")}
            </div>`;

      return `
        <details style="margin-top:12px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;overflow:hidden;">
          <summary style="padding:16px 18px;cursor:pointer;font-weight:600;list-style:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-weight:700;color:#0f172a;">${escapeHtml(row.name)}</div>
                <div style="margin-top:4px;font-size:12px;color:#64748b;">${escapeHtml(row.truckNumber || "-")} • ${escapeHtml(getStatusLabel(row.status))}</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-weight:700;">Iskorišteno ${row.usedDays}</span>
                <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${row.remainingDays <= 7 ? "#fff7ed" : "#f0fdf4"};color:${row.remainingDays <= 7 ? "#b45309" : "#166534"};font-weight:800;">Preostalo ${row.remainingDays}</span>
              </div>
            </div>
          </summary>
          ${content}
        </details>
      `;
    })
    .join("");

  return `
    <div style="margin:0;padding:32px 20px;background:#e2e8f0;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:1180px;margin:0 auto;background:#ffffff;border:1px solid #dbe4ee;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
        <div style="padding:34px 36px;background:#e5e7eb;color:#1e3a8a;border-bottom:1px solid #cbd5e1;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:#dbe4ee;color:#334155;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">Transport Manager • Weekly Report</div>
          <h1 style="margin:14px 0 8px;font-size:31px;line-height:1.15;color:#1e3a8a;">Sedmični Schengen izvještaj</h1>
          <p style="margin:0;max-width:760px;font-size:15px;line-height:1.6;color:#334155;">Jasan pregled preostalih i iskorištenih Schengen dana, uz sažetak kritičnih vozača i zadnjih 7 dana ulazaka i izlazaka iz Schengen zone.</p>
        </div>

		        <div style="padding:28px 36px 10px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:22px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px 18px;min-width:190px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Generisano</div>
              <div style="margin-top:8px;font-size:18px;font-weight:800;">${escapeHtml(generatedAt)}</div>
            </div>
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:16px 18px;min-width:190px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#1d4ed8;">Vozača u izvještaju</div>
              <div style="margin-top:8px;font-size:24px;font-weight:800;color:#1e3a8a;">${params.rows.length}</div>
            </div>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px 18px;min-width:230px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#9a3412;">Kritično stanje</div>
              <div style="margin-top:8px;font-size:24px;font-weight:800;color:#c2410c;">${criticalCount}</div>
              <div style="margin-top:4px;font-size:13px;color:#9a3412;">vozača sa 7 ili manje dana</div>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:16px 18px;min-width:230px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;">Rizik naredne 2 sedmice</div>
              <div style="margin-top:8px;font-size:24px;font-weight:800;color:#b45309;">${warningCount}</div>
              <div style="margin-top:4px;font-size:13px;color:#92400e;">vozača sa 8 do 14 dana</div>
            </div>
          </div>

          <div style="margin-bottom:14px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <div style="font-size:18px;font-weight:800;color:#0f172a;">Pregled preostalih dana</div>
            <div style="margin-top:6px;font-size:13px;color:#64748b;">Vozači su sortirani od najmanjeg broja preostalih dana. Prikaz je optimizovan za otvaranje na telefonu i desktopu.</div>
          </div>
          <div>
            ${driverCardsHtml}
          </div>

            <div style="margin-top:24px;">
              <div style="font-size:20px;font-weight:800;margin-bottom:8px;color:#0f172a;">Ulazi i izlazi u zadnjih 7 dana</div>
              <div style="font-size:13px;color:#64748b;margin-bottom:12px;">Proširi vozača za pregled zadnje sedmice detektovanih prelazaka. Prikaz koristi isti izvor kao Schengen UI.</div>
              ${detailsHtml}
            </div>
		        </div>

        <div style="padding:18px 36px 30px;color:#64748b;font-size:13px;background:#f8fafc;border-top:1px solid #e2e8f0;">
          Ovaj mail je generisan automatski petkom. Schengen obračun koristi 90/180 logiku, postojeće ručne override-e gdje su uneseni i isti border crossing izvor kao Schengen ekran u aplikaciji.
        </div>
      </div>
    </div>
  `;
}

function buildWeeklySchengenReportText(params: {
  generatedAt: string;
  rows: Awaited<ReturnType<typeof getSchengenSummaryRows>>["drivers"];
  borderCrossingsByDriver: Map<string, WeeklyBorderCrossing[]>;
}) {
  const lines = [
    "Sedmični Schengen izvještaj",
    `Generisano: ${formatDateTime(new Date(params.generatedAt))}`,
    "",
    "Vozači su poredani od najmanjeg broja preostalih Schengen dana:",
    "",
  ];

  params.rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.name} | preostalo: ${row.remainingDays} | iskorišteno: ${row.usedDays} | status: ${getStatusLabel(row.status)} | kamion: ${row.truckNumber || "-"} | email: ${row.email}`
    );

    const crossings = params.borderCrossingsByDriver.get(row.driverId) ?? [];
    if (crossings.length === 0) {
      lines.push("   Zadnjih 7 dana prelazaka: nema");
      return;
    }

    lines.push("   Zadnjih 7 dana prelazaka:");
    for (const crossing of crossings) {
      lines.push(
        `   - ${getCrossingTypeLabel(crossing.type)} | ${formatDateTime(new Date(crossing.crossingAt))}${crossing.borderCrossingName ? ` | ${crossing.borderCrossingName}` : ""}${crossing.confirmedAt ? ` | potvrđeno ${formatDateTime(new Date(crossing.confirmedAt))}` : " | čeka potvrdu"}`
      );
    }
  });

  return lines.join("\n");
}

export async function sendWeeklySchengenReportEmail(options?: {
  trigger?: "manual" | "cron";
  triggeredByName?: string | null;
  force?: boolean;
}) {
  const config = await getSchengenWeeklyReportConfig();
  const trigger = options?.trigger ?? "cron";
  const triggeredByName = options?.triggeredByName ?? null;
  const force = options?.force === true;

  if (!config.enabled && !force) {
    console.log("[Schengen Weekly Email] Skipped: disabled");
    return { sent: false, reason: "disabled" as const };
  }

  if (config.recipients.length === 0) {
    console.log("[Schengen Weekly Email] Skipped: no recipients");
    if (trigger === "manual") {
      await appendSchengenWeeklyReportHistory({
        id: `schengen-weekly-${Date.now()}`,
        triggeredAt: new Date().toISOString(),
        trigger,
        triggeredByName,
        recipients: [],
        success: false,
        reason: "Nema definisanih primaoca",
        driverCount: 0,
        criticalCount: 0,
      });
    }
    return { sent: false, reason: "no_recipients" as const };
  }

  const summary = await getSchengenSummaryRows();
  const criticalCount = summary.drivers.filter((row) => row.remainingDays <= 7).length;
  const borderCrossingsByDriver = await getWeeklyBorderCrossingsByDriver(
    summary.drivers.map((driver) => driver.driverId)
  );
  const html = buildWeeklySchengenReportHtml({
    generatedAt: summary.generatedAt,
    rows: summary.drivers,
    borderCrossingsByDriver,
  });
  const text = buildWeeklySchengenReportText({
    generatedAt: summary.generatedAt,
    rows: summary.drivers,
    borderCrossingsByDriver,
  });

  await sendHtmlEmail({
    to: config.recipients,
    subject: "Sedmični Schengen izvještaj po vozačima",
    html,
    text,
  });

  await appendSchengenWeeklyReportHistory({
    id: `schengen-weekly-${Date.now()}`,
    triggeredAt: new Date().toISOString(),
    trigger,
    triggeredByName,
    recipients: config.recipients,
    success: true,
    reason: null,
    driverCount: summary.drivers.length,
    criticalCount,
  });

  console.log(
    `[Schengen Weekly Email] Sent to ${config.recipients.join(", ")}`
  );

  return { sent: true, recipients: config.recipients, driverCount: summary.drivers.length, criticalCount };
}
