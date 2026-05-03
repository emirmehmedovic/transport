import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * GET /api/documents/[id]/download
 * Download dokumenta
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autentifikacija
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Dohvati dokument
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        load: { select: { id: true, driverId: true, requestedByUserId: true } },
        inspection: { select: { id: true, driverId: true } },
        incident: { select: { id: true, driverId: true } },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Permission check - drivers mogu downloadovati dokumente za svoje loadove
    if (decoded.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: decoded.userId },
      });

      // Provjerite da li je dokument vezan za vozača ili za load vozača
      let hasAccess = false;

      if (document.driverId === driver?.id) {
        // Dokument je direktno vezan za vozača
        hasAccess = true;
      } else if (document.load) {
        if (document.load.driverId === driver?.id) {
          hasAccess = true;
        }
      } else if (document.inspection && document.inspection.driverId === driver?.id) {
        hasAccess = true;
      } else if (document.incident && document.incident.driverId === driver?.id) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (decoded.role === 'CLIENT') {
      const hasAccess = document.load?.requestedByUserId === decoded.userId;
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Pročitaj file sa diska
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, document.filePath);

    const normalizedUploadDir = path.resolve(uploadDir);
    const normalizedFilePath = path.resolve(filePath);
    if (!normalizedFilePath.startsWith(normalizedUploadDir + path.sep)) {
      return NextResponse.json(
        { error: 'Nevažeća putanja dokumenta' },
        { status: 400 }
      );
    }

    const fileBuffer = await readFile(normalizedFilePath);

    // Return file kao response
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download document error:', error);

    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
