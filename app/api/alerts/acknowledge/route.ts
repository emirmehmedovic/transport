import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// POST /api/alerts/acknowledge
// Body: { alertId: string }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const alertId = body?.alertId as string | undefined;

    if (!alertId) {
      return NextResponse.json(
        { error: "alertId is required" },
        { status: 400 }
      );
    }

    const acknowledgement = await prisma.alertAcknowledgement.upsert({
      where: { alertId },
      update: {
        acknowledgedAt: new Date(),
        acknowledgedById: decoded.userId,
      },
      create: {
        alertId,
        acknowledgedAt: new Date(),
        acknowledgedById: decoded.userId,
      },
    });

    return NextResponse.json({ acknowledgement });
  } catch (error: any) {
    console.error("Error acknowledging alert:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}
