import { NextRequest, NextResponse } from "next/server";
import { sendTestNotification } from "@/lib/telegram";

/**
 * Test endpoint za Telegram notifikacije
 * GET /api/telegram/test
 * Query params:
 *  - chatId (optional): Specificiraj chat ID, inače koristi admin chat ID
 */
export async function GET(request: NextRequest) {
  try {
    // Dobij chatId iz query params ako postoji
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    // Pošalji test notifikaciju
    const result = await sendTestNotification(chatId || undefined);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: "Test notifikacija uspješno poslata!",
          chatId: chatId || process.env.TELEGRAM_ADMIN_CHAT_ID,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "Nije moguće poslati test notifikaciju",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Greška pri slanju test notifikacije:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Nepoznata greška",
      },
      { status: 500 }
    );
  }
}
