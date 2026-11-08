import { localDayStart, shiftDay, toDayKeyInTimeZone } from "./schengen-dates";
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
    timeZone: "Europe/Sarajevo",
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

  const todayKey = toDayKeyInTimeZone(new Date());
  const reportFrom = localDayStart(shiftDay(todayKey, -1));
  const reportTo = localDayStart(todayKey);
  const since = localDayStart(shiftDay(todayKey, -2));

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
      .filter(c => new Date(c.recordedAt) >= reportFrom && new Date(c.recordedAt) < reportTo)
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
      .slice(0, 180);
  } catch {
    return [];
  }
}

async function appendSchengenWeeklyReportHistory(entry: SchengenWeeklyReportHistoryEntry) {
  const existing = await getSchengenWeeklyReportHistory();
  const next = [entry, ...existing].slice(0, 180);

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

function reportDetail(row: Awaited<ReturnType<typeof getSchengenSummaryRows>>["drivers"][number]) {
  return [
    `Izvor: ${row.freshness.source === "nightly" ? "noćni izvještaj" : "pozicije / live"}.`,
    `Posljednja pozicija: ${row.freshness.lastPositionAt ? formatDateTime(new Date(row.freshness.lastPositionAt)) : "nema"}.`,
    row.freshness.note,
    row.freshness.uncertainTransition ? "Prelazak između pozicija obuhvata ponoć: datum prelaska treba provjeriti." : "",
    row.freshness.stale ? "UPOZORENJE: import nije potvrđen ili nema poznate pozicije." : "",
    row.freshness.assumedStillInside ? "Posljednje poznato stanje: u Schengenu; nastavak boravka danas je pretpostavka." : "",
    `Ako danas boravi (po dostupnim podacima): ${row.entryToday.usedDaysIncludingToday}/90; nakon današnjeg dana ostaje ${row.entryToday.remainingAfterToday}. ${row.entryToday.withinLimit ? "" : "PREKORAČENJE"}`,
    "Dani odmora između Schengen pozicija računaju se u boravak; dan bez vožnje nije automatski greška podataka.",
    "Procjena ne garantuje broj uzastopnih dana budućeg boravka.",
    row.legacyManualIgnored ? "Stari brojčani ručni saldo nije primijenjen; koristi se evidencija datuma." : "",
  ].filter(Boolean).join(" ");
}

type ReportParams = {
  generatedAt: string;
  rows: Awaited<ReturnType<typeof getSchengenSummaryRows>>["drivers"];
  borderCrossingsByDriver: Map<string, WeeklyBorderCrossing[]>;
};

function sortedReportRows(rows: ReportParams["rows"]) {
  return [...rows].sort((a, b) => a.remainingDays - b.remainingDays || a.name.localeCompare(b.name, "bs"));
}

export function buildWeeklySchengenReportHtml(params: ReportParams) {
  const today = toDayKeyInTimeZone(new Date(params.generatedAt));
  const rows = sortedReportRows(params.rows);
  const paragraph = (text: string) => `<p style="margin:8px 0;">${escapeHtml(text)}</p>`;
  const summary = rows.map(row => {
    const color = row.remainingDays <= 7 ? "#9a3412" : "#0f172a";
    const notice = row.freshness.stale || row.freshness.uncertainTransition
      ? "Provjeriti podatke" : row.usedDays > 90 ? "Prekoračenje" : row.remainingDays <= 7 ? "7 ili manje dana" : "";
    return `<tr>
      <th scope="row" style="padding:12px 8px;text-align:left;border-bottom:1px solid #e2e8f0;font-weight:600;overflow-wrap:anywhere;word-wrap:break-word;">${escapeHtml(row.name)}${notice ? `<br><span style="font-size:12px;font-weight:400;color:#9a3412;">${notice}</span>` : ""}</th>
      <td style="padding:12px 4px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:18px;">${row.usedDays}</td>
      <td style="padding:12px 4px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:18px;font-weight:700;color:${color};background:${row.remainingDays <= 7 ? "#fff7ed" : "#f8fafc"};">${row.remainingDays}</td>
    </tr>`;
  }).join("");
  const details = rows.map((row, index) => {
    const f = row.freshness;
    const crossings = params.borderCrossingsByDriver.get(row.driverId) ?? [];
    const warnings = [
      f.stale ? "Provjeriti podatke: import nije potvrđen ili nema poznate pozicije." : "",
      f.uncertainTransition ? "Prelazak između pozicija obuhvata ponoć: datum prelaska treba provjeriti." : "",
      f.assumedStillInside ? "Posljednje poznato stanje: u Schengenu. Nastavak boravka danas je pretpostavka." : "",
      row.legacyManualIgnored ? "Stari brojčani ručni saldo nije primijenjen; koristi se evidencija datuma." : "",
    ].filter(Boolean);
    return `<tr><td style="padding:20px 16px;border-top:1px solid #cbd5e1;overflow-wrap:anywhere;word-wrap:break-word;">
      <h3 style="margin:0 0 6px;font-size:18px;line-height:1.4;">${index + 1}. ${escapeHtml(row.name)}</h3>
      <p style="margin:0 0 12px;color:#475569;">Kamion: ${escapeHtml(row.truckNumber || "—")} · ${escapeHtml(getStatusLabel(row.status))}<br>${escapeHtml(row.email)}</p>
      <p style="margin:8px 0;"><strong>Posljednjih 180 dana:</strong> ${row.usedDays} iskorišteno · ${row.remainingDays} preostalo.</p>
      <p style="margin:8px 0;"><strong>Ako danas ulazi / boravi:</strong> ${row.entryToday.usedDaysIncludingToday} / 90 dana; nakon današnjeg dana ostaje <strong>${row.entryToday.remainingAfterToday}</strong>.${row.entryToday.withinLimit ? "" : ' <strong style="color:#9a3412;">PREKORAČENJE</strong>'}</p>
      ${paragraph(f.todayRecorded ? "Današnji dan je već uključen u obračun; ne dodaje se ponovo." : "Današnji dan još nije evidentiran kao Schengen dan. Procjena iznad uključuje i njega.")}
      <p style="margin:16px 0 6px;"><strong>Podaci i pozicije</strong></p>
      ${paragraph(`Izvor: ${f.source === "nightly" ? "noćni izvještaj" : "pozicije / live"}.`)}
      ${paragraph(`Posljednja pozicija: ${f.lastPositionAt ? formatDateTime(new Date(f.lastPositionAt)) : "nema poznate pozicije"}.`)}
      ${paragraph(f.note)}
      ${f.dataThrough ? paragraph(`Dostupni podaci do: ${f.dataThrough}.`) : ""}
      ${warnings.length ? `<div style="margin:12px 0;padding:8px 12px;background:#fff7ed;border-left:3px solid #c2410c;color:#9a3412;">${warnings.map(paragraph).join("")}</div>` : ""}
      <p style="margin:16px 0 6px;"><strong>Prelasci prethodnog dana</strong></p>
      ${crossings.length ? crossings.map(crossing => `<p style="margin:8px 0;padding:8px 0;border-top:1px solid #e2e8f0;"><strong>${escapeHtml(getCrossingTypeLabel(crossing.type))}</strong><br>${escapeHtml(formatDateTime(new Date(crossing.crossingAt)))}<br>${escapeHtml(crossing.borderCrossingName || "Prelaz nije imenovan")}<br><span style="color:#475569;">${crossing.confirmedAt ? `Potvrđeno ${escapeHtml(formatDateTime(new Date(crossing.confirmedAt)))}` : "Čeka potvrdu"}</span></p>`).join("") : paragraph("Nema zabilježenih prelazaka prethodnog dana.")}
    </td></tr>`;
  }).join("");
  return `<!doctype html>
<html lang="bs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dnevni Schengen izvještaj</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#0f172a;"><tr><td align="center" style="padding:12px 8px;">
<!--[if mso]><table role="presentation" width="680"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;table-layout:fixed;background:#ffffff;">
<tr><td style="padding:20px 16px 16px;background:#0f172a;color:#ffffff;">
  <p style="margin:0 0 6px;font-size:12px;color:#cbd5e1;">TRANSPORT MANAGER · DNEVNI IZVJEŠTAJ</p>
  <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;">Schengen dani</h1>
  <p style="margin:0;">${shiftDay(today, -179)} – ${today} · 180 dana</p>
  <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Generisano: ${escapeHtml(formatDateTime(new Date(params.generatedAt)))} · Europe/Sarajevo</p>
</td></tr>
<tr><td style="padding:16px 8px;">
  <h2 style="margin:0 8px 4px;font-size:18px;">Pregled vozača</h2>
  <p style="margin:0 8px 12px;color:#475569;font-size:13px;">Prvo vozači s najmanje preostalih dana. Brojevi su prema dostupnoj evidenciji.</p>
  <table aria-label="Pregled Schengen dana" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;">
    <thead><tr style="background:#f1f5f9;font-size:12px;">
      <th scope="col" style="width:48%;padding:10px 8px;text-align:left;">Vozač</th>
      <th scope="col" style="width:26%;padding:10px 2px;text-align:center;">Proveo<br><span style="font-weight:400;">u 180 dana</span></th>
      <th scope="col" style="width:26%;padding:10px 2px;text-align:center;">Preostalo<br><span style="font-weight:400;">od 90 dana</span></th>
    </tr></thead><tbody>${summary || '<tr><td colspan="3" style="padding:16px 8px;">Nema vozača za prikaz.</td></tr>'}</tbody>
  </table>
</td></tr>
<tr><td style="padding:8px 16px 20px;color:#475569;font-size:13px;">Dan ulaska i dan izlaska računaju se kao cijeli dani, čak i kada boravak traje samo nekoliko minuta. Dani odmora u Schengenu također se računaju; dan bez vožnje sam po sebi nije greška podataka.</td></tr>
${rows.length ? '<tr><td style="padding:16px;background:#f1f5f9;"><h2 style="margin:0;font-size:20px;">Detalji po vozaču</h2><p style="margin:4px 0 0;color:#475569;">Današnji ulazak, stanje podataka i prelasci.</p></td></tr>' : ""}
${details}
<tr><td style="padding:20px 16px;background:#f8fafc;color:#475569;font-size:12px;">Dnevni obračun se pokreće u 07:00, po vremenu Europe/Sarajevo. Period obuhvata današnji dan i prethodnih 179 dana; svaki dan se pomjera. Preostali saldo nije garancija broja uzastopnih dana budućeg boravka. Za vozače s noćnim izvještajem današnji boravak je procjena dok ne stignu novi podaci.</td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

export function buildWeeklySchengenReportText(params: ReportParams) {
  const rows = sortedReportRows(params.rows);
  const today = toDayKeyInTimeZone(new Date(params.generatedAt));
  const lines = [
    "Dnevni Schengen izvještaj",
    `Generisano: ${formatDateTime(new Date(params.generatedAt))} · Europe/Sarajevo`,
    `Period: ${shiftDay(today, -179)} – ${today} (180 kalendarskih dana)`,
    "", "PREGLED VOZAČA — najmanje preostalih dana prvo", "",
    ...rows.map((row, index) => `${index + 1}. ${row.name} | proveo u 180 dana: ${row.usedDays} | preostalo: ${row.remainingDays}`),
    ...(rows.length ? [] : ["Nema vozača za prikaz."]),
    "", "Dan ulaska i dan izlaska računaju se kao cijeli dani. Dani odmora u Schengenu također se računaju.",
    "", "DETALJI PO VOZAČU", "",
  ];
  rows.forEach((row, index) => {
    lines.push(`${index + 1}. ${row.name} | status: ${getStatusLabel(row.status)} | kamion: ${row.truckNumber || "-"} | email: ${row.email}`);
    lines.push(reportDetail(row));
    lines.push(row.freshness.todayRecorded ? "Današnji dan je već uključen; ne dodaje se ponovo." : "Današnji dan još nije evidentiran; procjena uključuje i njega.");
    if (row.freshness.dataThrough) lines.push(`Dostupni podaci do: ${row.freshness.dataThrough}.`);
    const crossings = params.borderCrossingsByDriver.get(row.driverId) ?? [];
    lines.push("Prelasci prethodnog dana:");
    if (!crossings.length) lines.push("Nema zabilježenih prelazaka.");
    for (const crossing of crossings) {
      lines.push(`- ${getCrossingTypeLabel(crossing.type)} | ${formatDateTime(new Date(crossing.crossingAt))}${crossing.borderCrossingName ? ` | ${crossing.borderCrossingName}` : ""}${crossing.confirmedAt ? ` | potvrđeno ${formatDateTime(new Date(crossing.confirmedAt))}` : " | čeka potvrdu"}`);
    }
    lines.push("");
  });
  lines.push("Dnevni obračun u 07:00 (Europe/Sarajevo). Period se pomjera svaki dan: danas i prethodnih 179 dana.");
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

  try {
  await sendHtmlEmail({
    to: config.recipients,
    subject: "Dnevni Schengen izvještaj po vozačima",
    html,
    text,
  });

  } catch (error) {
    await appendSchengenWeeklyReportHistory({ id: `schengen-daily-${Date.now()}`, triggeredAt: new Date().toISOString(), trigger, triggeredByName, recipients: config.recipients, success: false, reason: error instanceof Error ? error.message : "Slanje nije potvrđeno", driverCount: summary.drivers.length, criticalCount });
    throw error;
  }
  await appendSchengenWeeklyReportHistory({
    id: `schengen-daily-${Date.now()}`,
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
