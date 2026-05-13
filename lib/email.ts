import nodemailer from "nodemailer";

const DEFAULT_FROM = process.env.MAIL_FROM || "transport@localhost";

function normalizeRecipients(recipients: string[]) {
  return recipients.map((recipient) => recipient.trim()).filter(Boolean);
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    throw new Error("SMTP_HOST nije postavljen");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT nije ispravan");
  }

  if (!user || !pass) {
    throw new Error("SMTP_USER i SMTP_PASS moraju biti postavljeni");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    requireTLS: parseBoolean(process.env.SMTP_REQUIRE_TLS, !secure),
    tls: {
      rejectUnauthorized: !parseBoolean(process.env.SMTP_ALLOW_SELF_SIGNED, false),
    },
  });
}

export async function sendHtmlEmail(params: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  const recipients = normalizeRecipients(params.to);
  if (recipients.length === 0) {
    throw new Error("Nema definisanih primalaca za email");
  }

  const transporter = createTransporter();
  const text = params.text?.trim() || stripHtml(params.html);

  await transporter.sendMail({
    from: params.from || DEFAULT_FROM,
    to: recipients.join(", "),
    subject: params.subject,
    text,
    html: params.html,
  });
}
