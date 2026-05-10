import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";
import { auditUpdate, auditDelete, AuditEntity } from "@/lib/auditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/managers/[id] - Get single manager details (ADMIN only)
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

    const manager = await prisma.manager.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            telegramChatId: true,
          },
        },
      },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Manager nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json({ manager });
  } catch (error: any) {
    console.error("Error fetching manager:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju managera" },
      { status: 500 }
    );
  }
}

// PATCH /api/managers/[id] - Update manager (ADMIN only)
export async function PATCH(
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

    const body = await req.json();

    // Check if manager exists
    const existingManager = await prisma.manager.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!existingManager) {
      return NextResponse.json(
        { error: "Manager nije pronađen" },
        { status: 404 }
      );
    }

    // Check traccarDeviceId uniqueness if updating
    if (body.traccarDeviceId && body.traccarDeviceId !== existingManager.traccarDeviceId) {
      const existingDriver = await prisma.driver.findUnique({
        where: { traccarDeviceId: body.traccarDeviceId },
      });

      const existingOtherManager = await prisma.manager.findFirst({
        where: {
          traccarDeviceId: body.traccarDeviceId,
          id: { not: params.id },
        },
      });

      if (existingDriver || existingOtherManager) {
        return NextResponse.json(
          { error: "Traccar Device ID već postoji" },
          { status: 400 }
        );
      }
    }

    // Update user data if provided
    if (body.user) {
      await prisma.user.update({
        where: { id: existingManager.userId },
        data: {
          firstName: body.user.firstName,
          lastName: body.user.lastName,
          email: body.user.email,
          phone: body.user.phone,
          telegramChatId: body.user.telegramChatId,
        },
      });
    }

    // Update manager data
    const updatedManager = await prisma.manager.update({
      where: { id: params.id },
      data: {
        hireDate: body.hireDate,
        department: body.department,
        status: body.status,
        traccarDeviceId: body.traccarDeviceId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            telegramChatId: true,
          },
        },
      },
    });

    // Audit log
    await auditUpdate(
      decoded.userId,
      AuditEntity.MANAGER,
      params.id,
      existingManager,
      updatedManager
    );

    return NextResponse.json({ manager: updatedManager });
  } catch (error: any) {
    console.error("Error updating manager:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email ili Device ID već postoji" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Greška pri ažuriranju managera" },
      { status: 500 }
    );
  }
}

// DELETE /api/managers/[id] - Delete manager (ADMIN only)
export async function DELETE(
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

    // Delete manager (cascade will handle related records)
    await prisma.manager.delete({
      where: { id: params.id },
    });

    // Audit log
    await auditDelete(
      decoded.userId,
      AuditEntity.MANAGER,
      params.id,
      manager
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting manager:", error);
    return NextResponse.json(
      { error: "Greška pri brisanju managera" },
      { status: 500 }
    );
  }
}
