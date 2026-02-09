import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

/**
 * Šalje Telegram notifikaciju na specificirani chat ID
 * @param chatId - Telegram chat ID primaoca
 * @param message - Poruka koja će biti poslata
 * @param parseMode - Format poruke (HTML, Markdown, ili undefined)
 * @returns Promise sa rezultatom slanja
 */
export async function sendTelegramNotification(
  chatId: string | number,
  message: string,
  parseMode: "HTML" | "Markdown" | undefined = "HTML"
): Promise<{ success: boolean; error?: string }> {
  // Provjeri da li je bot token postavljen
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN nije postavljen u .env file");
    return { success: false, error: "Bot token nije konfigurisan" };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
    });

    if (response.data.ok) {
      console.log(`✅ Telegram notifikacija poslata na chat ID: ${chatId}`);
      return { success: true };
    } else {
      console.error(`❌ Telegram API greška:`, response.data);
      return { success: false, error: response.data.description };
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`❌ Greška pri slanju Telegram notifikacije:`, error.message);
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }

    console.error(`❌ Nepoznata greška pri slanju notifikacije:`, error);
    return { success: false, error: "Nepoznata greška" };
  }
}

/**
 * Šalje notifikaciju admin-u (koristi TELEGRAM_ADMIN_CHAT_ID iz .env)
 * @param message - Poruka koja će biti poslata
 * @param parseMode - Format poruke
 * @returns Promise sa rezultatom slanja
 */
export async function sendAdminNotification(
  message: string,
  parseMode: "HTML" | "Markdown" | undefined = "HTML"
): Promise<{ success: boolean; error?: string }> {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    console.error("❌ TELEGRAM_ADMIN_CHAT_ID nije postavljen u .env file");
    return { success: false, error: "Admin chat ID nije konfigurisan" };
  }

  return sendTelegramNotification(TELEGRAM_ADMIN_CHAT_ID, message, parseMode);
}

/**
 * Notification template za novi load assignment
 */
export function createLoadAssignedNotification(data: {
  loadNumber: string;
  driverName: string;
  truckNumber: string;
  pickupCity: string;
  pickupState: string;
  deliveryCity: string;
  deliveryState: string;
  scheduledPickupDate: string;
}): string {
  return `
🚚 <b>Novi Load Dodijeljen</b>

📋 <b>Load:</b> ${data.loadNumber}
👤 <b>Vozač:</b> ${data.driverName}
🚛 <b>Kamion:</b> ${data.truckNumber}

📍 <b>Ruta:</b>
   ${data.pickupCity}, ${data.pickupState} → ${data.deliveryCity}, ${data.deliveryState}

📅 <b>Planirani pickup:</b> ${data.scheduledPickupDate}
  `.trim();
}

/**
 * Notification template za promjenu statusa loada
 */
export function createLoadStatusChangedNotification(data: {
  loadNumber: string;
  driverName: string;
  oldStatus: string;
  newStatus: string;
  location?: string;
}): string {
  const statusEmoji: Record<string, string> = {
    ASSIGNED: "📝",
    ACCEPTED: "✅",
    PICKED_UP: "📦",
    IN_TRANSIT: "🚛",
    DELIVERED: "🎯",
    COMPLETED: "✔️",
    CANCELLED: "❌",
  };

  const emoji = statusEmoji[data.newStatus] || "🔄";

  let message = `
${emoji} <b>Status Load-a Promijenjen</b>

📋 <b>Load:</b> ${data.loadNumber}
👤 <b>Vozač:</b> ${data.driverName}

📊 <b>Status:</b> ${data.oldStatus} → <b>${data.newStatus}</b>
  `.trim();

  if (data.location) {
    message += `\n📍 <b>Lokacija:</b> ${data.location}`;
  }

  return message;
}

/**
 * Notification template za upload dokumenta
 */
export function createDocumentUploadedNotification(data: {
  loadNumber: string;
  documentType: string;
  uploadedBy: string;
  fileName: string;
}): string {
  return `
📄 <b>Dokument Uploadovan</b>

📋 <b>Load:</b> ${data.loadNumber}
📎 <b>Tip:</b> ${data.documentType}
👤 <b>Uploadovao:</b> ${data.uploadedBy}
📁 <b>File:</b> ${data.fileName}
  `.trim();
}

/**
 * Notification template za maintenance due
 */
export function createMaintenanceDueNotification(data: {
  truckNumber: string;
  maintenanceType: string;
  currentMileage: number;
  dueMileage?: number;
  daysOverdue?: number;
}): string {
  const isOverdue = data.daysOverdue && data.daysOverdue > 0;
  const emoji = isOverdue ? "🔴" : "⚠️";

  let message = `
${emoji} <b>${isOverdue ? "URGENT: " : ""}Maintenance ${isOverdue ? "Overdue" : "Due"}</b>

🚛 <b>Kamion:</b> ${data.truckNumber}
🔧 <b>Tip:</b> ${data.maintenanceType}
📊 <b>Trenutna kilometraža:</b> ${data.currentMileage.toLocaleString()}
  `.trim();

  if (data.dueMileage) {
    message += `\n⏰ <b>Due na:</b> ${data.dueMileage.toLocaleString()} km`;
  }

  if (isOverdue && data.daysOverdue) {
    message += `\n⚠️ <b>Overdue:</b> ${data.daysOverdue} dana`;
  }

  return message;
}

/**
 * Notification template za expiring compliance documents
 */
export function createComplianceExpiringNotification(data: {
  driverName: string;
  documentType: string;
  expiryDate: string;
  daysUntilExpiry: number;
}): string {
  const isUrgent = data.daysUntilExpiry <= 7;
  const emoji = isUrgent ? "🔴" : data.daysUntilExpiry <= 15 ? "⚠️" : "📋";

  return `
${emoji} <b>${isUrgent ? "URGENT: " : ""}Compliance Dokument Ističe</b>

👤 <b>Vozač:</b> ${data.driverName}
📄 <b>Dokument:</b> ${data.documentType}
📅 <b>Ističe:</b> ${data.expiryDate}
⏰ <b>Preostalo:</b> ${data.daysUntilExpiry} dana

${isUrgent ? "⚠️ Hitno potrebna akcija!" : ""}
  `.trim();
}

/**
 * Test funkcija - šalje test notifikaciju
 */
export async function sendTestNotification(
  chatId?: string | number
): Promise<{ success: boolean; error?: string }> {
  const targetChatId = chatId || TELEGRAM_ADMIN_CHAT_ID;

  if (!targetChatId) {
    return { success: false, error: "Chat ID nije specificiran" };
  }

  const message = `
🧪 <b>Test Notifikacija</b>

✅ Telegram bot je uspješno konfigurisan!

📱 Chat ID: ${targetChatId}
⏰ Vrijeme: ${new Date().toLocaleString("bs-BA")}

Sistem je spreman za slanje notifikacija.
  `.trim();

  return sendTelegramNotification(targetChatId, message);
}
