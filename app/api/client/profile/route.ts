import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize(request: NextRequest) {
  const decoded = await getVerifiedAuthUserFromRequest(request);
  if (!decoded || decoded.role !== "CLIENT") return null;
  return decoded;
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await authorize(req);
    if (!decoded) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const profile = await prisma.clientProfile.findUnique({
      where: { userId: decoded.userId },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return NextResponse.json({ error: "Greška pri učitavanju profila" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const decoded = await authorize(req);
    if (!decoded) {
      return NextResponse.json({ error: "Nemate dozvolu za pristup" }, { status: 403 });
    }

    const body = await req.json();

    const upserted = await prisma.clientProfile.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        companyName: body?.companyName || null,
        companyAddress: body?.companyAddress || null,
        city: body?.city || null,
        state: body?.state || null,
        zip: body?.zip || null,
        contactPerson: body?.contactPerson || null,
        contactPhone: body?.contactPhone || null,
        notes: body?.notes || null,
      },
      update: {
        companyName: body?.companyName || null,
        companyAddress: body?.companyAddress || null,
        city: body?.city || null,
        state: body?.state || null,
        zip: body?.zip || null,
        contactPerson: body?.contactPerson || null,
        contactPhone: body?.contactPhone || null,
        notes: body?.notes || null,
      },
    });

    return NextResponse.json({ profile: upserted });
  } catch (error) {
    console.error("Error updating client profile:", error);
    return NextResponse.json({ error: "Greška pri ažuriranju profila" }, { status: 500 });
  }
}
