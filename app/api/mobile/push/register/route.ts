import { NextRequest, NextResponse } from "next/server";
import { MobilePushPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePlatform(value: unknown): MobilePushPlatform {
  if (value === "ANDROID" || value === "IOS" || value === "UNKNOWN") {
    return value;
  }
  return "ANDROID";
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const body = await req.json();
    const pushToken = typeof body?.pushToken === "string" ? body.pushToken.trim() : "";
    const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : null;
    const appVersion = typeof body?.appVersion === "string" ? body.appVersion.trim() : null;

    if (!pushToken) {
      return NextResponse.json({ error: "pushToken je obavezan" }, { status: 400 });
    }

    await prisma.mobilePushDevice.upsert({
      where: {
        pushToken,
      },
      update: {
        userId: decoded.userId,
        platform: parsePlatform(body?.platform),
        deviceName,
        appVersion,
        isActive: true,
        lastRegisteredAt: new Date(),
        lastSeenAt: new Date(),
      },
      create: {
        userId: decoded.userId,
        pushToken,
        platform: parsePlatform(body?.platform),
        deviceName,
        appVersion,
        isActive: true,
        lastRegisteredAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mobile push register error:", error);
    return NextResponse.json(
      { error: "Greška pri registraciji push uređaja" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const pushToken = typeof body?.pushToken === "string" ? body.pushToken.trim() : "";

    if (!pushToken) {
      return NextResponse.json({ error: "pushToken je obavezan" }, { status: 400 });
    }

    await prisma.mobilePushDevice.updateMany({
      where: {
        userId: decoded.userId,
        pushToken,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mobile push unregister error:", error);
    return NextResponse.json(
      { error: "Greška pri deaktivaciji push uređaja" },
      { status: 500 }
    );
  }
}
