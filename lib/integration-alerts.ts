import { prisma } from "./prisma";
import { sendHtmlEmail } from "./email";

export function escapeAlertHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function formatAlertTime(value: string | null) {
  if (!value) return "nije zabilježeno";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " (Europe/Sarajevo)";
}

/** Persist before SMTP: a restart or ambiguous SMTP timeout must not send duplicates.
 * Failed/uncertain delivery is retained for operator review, never retried in a loop.
 */
export async function sendIntegrationAlertOnce(key: string, subject: string, text: string) {
  const settingKey = `integration_alert:${key}`;
  try {
    await prisma.setting.create({ data: { key: settingKey, value: JSON.stringify({ status: "sending", attemptedAt: new Date().toISOString(), subject }) } });
  } catch (error: any) {
    if (error?.code === "P2002") return false;
    throw error;
  }
  try {
    const recipients = (process.env.INTEGRATION_ALERT_RECIPIENTS || "emir.m@live.com").split(",").map(s => s.trim()).filter(Boolean);
    await sendHtmlEmail({ timeoutMs: 30_000, to: recipients, subject, text, html: `<div style="font:15px/1.6 Arial,sans-serif;max-width:760px"><h2>${escapeAlertHtml(subject)}</h2><p>${escapeAlertHtml(text).replace(/\n/g, "<br/>")}</p></div>` });
    await prisma.setting.update({ where: { key: settingKey }, data: { value: JSON.stringify({ status: "sent", sentAt: new Date().toISOString(), subject }) } });
    return true;
  } catch (error) {
    await prisma.setting.update({ where: { key: settingKey }, data: { value: JSON.stringify({ status: "delivery_unconfirmed", failedAt: new Date().toISOString(), subject }) } });
    throw error;
  }
}
