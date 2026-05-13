import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import {
  getSchengenWeeklyReportConfig,
  saveSchengenWeeklyReportConfig,
} from "@/lib/schengen-weekly-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
  }

  const config = await getSchengenWeeklyReportConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const recipients =
      Array.isArray(body.recipients) ? body.recipients.map((item: unknown) => String(item)) : [];

    const config = await saveSchengenWeeklyReportConfig({
      enabled: body.enabled === true,
      recipients,
    });

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri čuvanju postavki Schengen mail izvještaja",
      },
      { status: 400 }
    );
  }
}
