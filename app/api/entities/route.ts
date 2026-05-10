import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedAuthUserFromRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/entities - Get all drivers and managers (for replay/tracking selection)
 * Returns combined list with type field
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await getVerifiedAuthUserFromRequest(req);
    if (!decoded) {
      return NextResponse.json(
        { error: "Neautorizovan pristup" },
        { status: 401 }
      );
    }

    // Only ADMIN and DISPATCHER can access
    if (decoded.role !== "ADMIN" && decoded.role !== "DISPATCHER") {
      return NextResponse.json(
        { error: "Nemate dozvolu za pristup" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "200");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortDir = searchParams.get("sortDir") || "asc";

    // Fetch drivers
    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
        status: true,
        traccarDeviceId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy:
        sortBy === "name"
          ? { user: { firstName: sortDir as "asc" | "desc" } }
          : { createdAt: sortDir as "asc" | "desc" },
    });

    // Fetch managers (only for ADMIN)
    const managers =
      decoded.role === "ADMIN"
        ? await prisma.manager.findMany({
            select: {
              id: true,
              status: true,
              traccarDeviceId: true,
              department: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy:
              sortBy === "name"
                ? { user: { firstName: sortDir as "asc" | "desc" } }
                : { createdAt: sortDir as "asc" | "desc" },
          })
        : [];

    // Map to unified format
    const driverEntities = drivers.map((d) => ({
      id: d.id,
      type: "DRIVER" as const,
      name: `${d.user.firstName} ${d.user.lastName}`.trim(),
      status: d.status,
      traccarDeviceId: d.traccarDeviceId,
    }));

    const managerEntities = managers.map((m) => ({
      id: m.id,
      type: "MANAGER" as const,
      name: `${m.user.firstName} ${m.user.lastName}`.trim(),
      status: m.status,
      traccarDeviceId: m.traccarDeviceId,
      department: m.department,
    }));

    // Combine and sort
    const allEntities = [...driverEntities, ...managerEntities].sort((a, b) => {
      if (sortBy === "name") {
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

    // Pagination
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedEntities = allEntities.slice(start, end);

    return NextResponse.json({
      entities: paginatedEntities,
      pagination: {
        page,
        pageSize,
        total: allEntities.length,
        totalPages: Math.ceil(allEntities.length / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching entities:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju entiteta" },
      { status: 500 }
    );
  }
}
