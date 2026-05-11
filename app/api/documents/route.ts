import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/documents
 * List dokumenata sa filterima
 *
 * Query params:
 * - loadId: filter by load
 * - driverId: filter by driver
 * - type: filter by document type
 * - inspectionId: filter by inspection
 * - incidentId: filter by incident
 * - approvalStatus: filter by approval workflow status
 * - search: search by filename
 * - page: page number (default 1)
 * - limit: items per page (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Autentifikacija
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Nevažeća autentifikacija' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const loadId = searchParams.get('loadId') || undefined;
    const driverId = searchParams.get('driverId') || undefined;
    const inspectionId = searchParams.get('inspectionId') || undefined;
    const incidentId = searchParams.get('incidentId') || undefined;
    const approvalStatus = searchParams.get('approvalStatus') || undefined;
    const type = searchParams.get('type') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build where clause
    const where: any = {};

    // Permission check - drivers mogu vidjeti dokumente za svoje loadove
    if (decoded.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: decoded.userId },
      });

      if (loadId) {
        // Provjeri da li je load dodijeljen ovom vozaču
        const load = await prisma.load.findUnique({
          where: { id: loadId },
        });

        if (!load || load.driverId !== driver?.id) {
          return NextResponse.json(
            { error: 'Nemate dozvolu za pristup dokumentima ovog loada' },
            { status: 403 }
          );
        }

        // Vozač može vidjeti sve dokumente za svoj load
        where.loadId = loadId;
      } else if (inspectionId) {
        const inspection = await prisma.inspection.findUnique({
          where: { id: inspectionId },
        });
        if (!inspection || inspection.driverId !== driver?.id) {
          return NextResponse.json(
            { error: 'Nemate dozvolu za pristup dokumentima ove inspekcije' },
            { status: 403 }
          );
        }
        where.inspectionId = inspectionId;
      } else if (incidentId) {
        const incident = await prisma.incident.findUnique({
          where: { id: incidentId },
        });
        if (!incident || incident.driverId !== driver?.id) {
          return NextResponse.json(
            { error: 'Nemate dozvolu za pristup dokumentima incidenta' },
            { status: 403 }
          );
        }
        where.incidentId = incidentId;
      } else if (driverId) {
        // Ako se traže dokumenti po driverId, dozvoli samo svoje
        if (driverId !== driver?.id) {
          return NextResponse.json(
            { error: 'Nemate dozvolu za pristup dokumentima drugog vozača' },
            { status: 403 }
          );
        }
        where.driverId = driverId;
      } else {
        // Ako nema filtera, prikaži samo dokumente ovog vozača
        where.driverId = driver?.id;
      }
    } else if (decoded.role === 'CLIENT') {
      if (loadId) {
        const load = await prisma.load.findUnique({
          where: { id: loadId },
          select: { id: true, requestedByUserId: true },
        });

        if (!load || load.requestedByUserId !== decoded.userId) {
          return NextResponse.json(
            { error: 'Nemate dozvolu za pristup dokumentima ovog loada' },
            { status: 403 }
          );
        }

        where.loadId = loadId;
      } else {
        return NextResponse.json(
          { error: 'Klijent može pregledati samo dokumente svojih loadova' },
          { status: 403 }
        );
      }
    } else {
      // Admin/Dispatcher mogu vidjeti sve dokumente sa filterima
      if (loadId) {
        where.loadId = loadId;
      }

      if (driverId) {
        where.driverId = driverId;
      }
      if (inspectionId) {
        where.inspectionId = inspectionId;
      }
      if (incidentId) {
        where.incidentId = incidentId;
      }
    }

    if (type) {
      where.type = type;
    }

    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    if (search) {
      where.fileName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Count total
    const total = await prisma.document.count({ where });

    // Fetch documents
    const documents = await prisma.document.findMany({
      where,
      include: {
        load: {
          select: {
            id: true,
            loadNumber: true,
          },
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const uploadedByIds = Array.from(
      new Set(
        documents
          .map((document) => document.uploadedById)
          .filter((value): value is string => Boolean(value))
      )
    );

    const uploaders = uploadedByIds.length
      ? await prisma.user.findMany({
          where: {
            id: { in: uploadedByIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : [];

    const uploaderMap = new Map(uploaders.map((user) => [user.id, user]));
    const documentsWithUploaders = documents.map((document) => ({
      ...document,
      uploadedBy: document.uploadedById
        ? uploaderMap.get(document.uploadedById) || null
        : null,
    }));

    return NextResponse.json({
      documents: documentsWithUploaders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
