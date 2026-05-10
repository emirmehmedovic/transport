import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/managers/[id]/positions - Get position history for manager (ADMIN only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "1000");

    // Check if manager exists
    const manager = await prisma.manager.findUnique({
      where: { id: params.id },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager nije pronađen" },
        { status: 404 }
      );
    }

    const where: any = {
      managerId: params.id,
    };

    if (startDate && endDate) {
      where.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const positions = await prisma.position.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      take: limit,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        altitude: true,
        speed: true,
        bearing: true,
        accuracy: true,
        battery: true,
        recordedAt: true,
        receivedAt: true,
      },
    });

    return NextResponse.json({ positions });
  } catch (error: any) {
    console.error("Error fetching manager positions:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju pozicija" },
      { status: 500 }
    );
  }
}
