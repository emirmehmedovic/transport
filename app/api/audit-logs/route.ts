import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { AuditAction, AuditEntity } from "@prisma/client";

/**
 * GET /api/audit-logs
 * Vraća audit logs sa filterima i paginacijom
 *
 * Query params:
 * - page: broj stranice (default: 1)
 * - limit: broj rezultata po stranici (default: 50, max: 100)
 * - entity: filter po entity type (USER, DRIVER, TRUCK, LOAD, DOCUMENT, PAY_STUB, MAINTENANCE, EXPENSE)
 * - action: filter po action type (CREATE, UPDATE, DELETE, STATUS_CHANGE, DOCUMENT_UPLOAD, ASSIGNMENT, PAYMENT)
 * - userId: filter po user ID
 * - entityId: filter po entity ID
 * - startDate: filter po datumu (ISO string)
 * - endDate: filter po datumu (ISO string)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can view audit logs" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const entity = searchParams.get("entity") as AuditEntity | null;
    const action = searchParams.get("action") as AuditAction | null;
    const userId = searchParams.get("userId");
    const entityId = searchParams.get("entityId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: any = {};

    if (entity) {
      where.entity = entity;
    }

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch audit logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
