import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import {
  getSchengenWeeklyReportConfig,
  getSchengenWeeklyReportHistory,
  sendWeeklySchengenReportEmail,
} from "@/lib/schengen-weekly-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
  }

  const [config, history] = await Promise.all([
    getSchengenWeeklyReportConfig(),
    getSchengenWeeklyReportHistory(),
  ]);

  return NextResponse.json({ config, history });
}

export async function POST(req: NextRequest) {
  const user = await getVerifiedAuthUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nemate dozvolu" }, { status: 403 });
  }

  try {
    const result = await sendWeeklySchengenReportEmail({
      trigger: "manual",
      triggeredByName: `${user.firstName} ${user.lastName}`.trim(),
      force: true,
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            result.reason === "no_recipients"
              ? "Nema definisanih primaoca za Schengen izvještaj"
              : "Slanje Schengen izvještaja nije uspjelo",
        },
        { status: 400 }
      );
    }

    const history = await getSchengenWeeklyReportHistory();
    return NextResponse.json({ result, history });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Greška pri slanju Schengen izvještaja" },
      { status: 500 }
    );
  }
}
