import { DriverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendHtmlEmail } from "@/lib/email";
import { getSchengenSummaryRows } from "@/lib/schengen-summary";

export const SCHENGEN_WEEKLY_REPORT_SETTING_KEY = "schengen_weekly_report_config";

export type SchengenWeeklyReportConfig = {
  enabled: boolean;
  recipients: string[];
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
  });

  return lines.join("\n");
}

export async function sendWeeklySchengenReportEmail() {
  const config = await getSchengenWeeklyReportConfig();

  if (!config.enabled) {
    console.log("[Schengen Weekly Email] Skipped: disabled");
    return { sent: false, reason: "disabled" as const };
  }

  if (config.recipients.length === 0) {
    console.log("[Schengen Weekly Email] Skipped: no recipients");
    return { sent: false, reason: "no_recipients" as const };
  }

  const summary = await getSchengenSummaryRows();
  const html = buildWeeklySchengenReportHtml({
    generatedAt: summary.generatedAt,
    rows: summary.drivers,
  });
  const text = buildWeeklySchengenReportText({
    generatedAt: summary.generatedAt,
    rows: summary.drivers,
  });

  await sendHtmlEmail({
    to: config.recipients,
    subject: "Sedmični Schengen izvještaj po vozačima",
    html,
    text,
  });

  console.log(
    `[Schengen Weekly Email] Sent to ${config.recipients.join(", ")}`
  );

  return { sent: true, recipients: config.recipients };
}
