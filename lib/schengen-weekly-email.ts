import { AppNotificationType, DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";
import { getSchengenSummaryRows } from "@/lib/schengen-summary";

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

  const notifications = await prisma.appNotification.findMany({
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
      type: true,
      confirmedAt: true,
      data: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const byDriver = new Map<string, WeeklyBorderCrossing[]>();

  for (const notification of notifications) {
    if (!notification.driverId) {
      continue;
    }

    const payload =
      notification.data && typeof notification.data === "object"
        ? (notification.data as Record<string, unknown>)
        : null;

    const crossingAtRaw =
      typeof payload?.crossingAt === "string"
        ? payload.crossingAt
        : notification.createdAt.toISOString();
    const crossingAt = new Date(crossingAtRaw);

    if (Number.isNaN(crossingAt.getTime())) {
      continue;
    }

    const entry: WeeklyBorderCrossing = {
      crossingAt: crossingAt.toISOString(),
      borderCrossingName:
        typeof payload?.borderCrossingName === "string"
          ? payload.borderCrossingName
          : null,
      type: notification.type,
      confirmedAt: notification.confirmedAt?.toISOString() ?? null,
    };

    const existing = byDriver.get(notification.driverId) ?? [];
    existing.push(entry);
    byDriver.set(notification.driverId, existing);
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

  const rowsHtml = params.rows
    .map((row, index) => {
      const severity =
        row.remainingDays <= 3
          ? "#dc2626"
          : row.remainingDays <= 7
            ? "#d97706"
            : "#0f172a";

      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">${index + 1}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(row.name)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(row.email)}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(getStatusLabel(row.status))}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(row.truckNumber || "-")}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${row.usedDays}</td>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;color:${severity};">${row.remainingDays}</td>
        </tr>
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

                  return `
                    <div style="padding:10px 0;border-top:1px solid #e2e8f0;font-size:13px;">
                      <div style="font-weight:600;color:#0f172a;">${escapeHtml(getCrossingTypeLabel(crossing.type))}</div>
                      <div style="margin-top:4px;color:#334155;">${escapeHtml(formatDateTime(new Date(crossing.crossingAt)))}${crossing.borderCrossingName ? ` • ${escapeHtml(crossing.borderCrossingName)}` : ""}</div>
                      <div style="margin-top:3px;color:#64748b;">${escapeHtml(confirmationLabel)}</div>
                    </div>
                  `;
                })
                .join("")}
            </div>`;

      return `
        <details style="margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
          <summary style="padding:14px 16px;cursor:pointer;font-weight:600;">
            ${escapeHtml(row.name)} • preostalo ${row.remainingDays} dana
          </summary>
          ${content}
        </details>
      `;
    })
    .join("");

  return `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:1100px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Transport Management</div>
          <h1 style="margin:10px 0 6px;font-size:28px;line-height:1.2;">Sedmični Schengen izvještaj</h1>
          <p style="margin:0;font-size:14px;opacity:0.9;">Stanje preostalih Schengen dana po vozaču. Vozači su poredani od najmanjeg broja preostalih dana.</p>
        </div>

	        <div style="padding:24px 32px 8px;">
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;min-width:180px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Generisano</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;">${escapeHtml(generatedAt)}</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;min-width:180px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Vozača u izvještaju</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;">${params.rows.length}</div>
            </div>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;min-width:180px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#9a3412;">Kritično stanje</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;color:#9a3412;">${criticalCount} vozača sa 7 ili manje dana</div>
            </div>
          </div>

	          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;text-align:left;">
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;">#</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;">Vozač</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;">Email</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;">Status</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;">Kamion</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;text-align:center;">Iskorišteno</th>
                <th style="padding:12px 10px;border-bottom:1px solid #cbd5e1;text-align:center;">Preostalo</th>
              </tr>
            </thead>
	            <tbody>
	              ${rowsHtml}
	            </tbody>
	          </table>

            <div style="margin-top:24px;">
              <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Zadnjih 7 dana prelazaka</div>
              <div style="font-size:13px;color:#64748b;margin-bottom:12px;">Proširi vozača za pregled zadnje sedmice border crossing događaja.</div>
              ${detailsHtml}
            </div>
	        </div>

        <div style="padding:18px 32px 28px;color:#64748b;font-size:13px;">
          Ovaj mail je generisan automatski petkom. Schengen obračun koristi 90/180 logiku i postojeće ručne override-e gdje su uneseni.
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
