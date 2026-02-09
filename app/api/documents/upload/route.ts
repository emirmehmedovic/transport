import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processUpload, DocumentType } from '@/lib/fileUpload';
import { verifyToken } from '@/lib/auth';
import {
  sendAdminNotification,
  createDocumentUploadedNotification,
} from '@/lib/telegram';

/**
 * POST /api/documents/upload
 * Upload dokument
 *
 * Body (FormData):
 * - file: File (required)
 * - type: DocumentType (required)
 * - loadId: string (optional)
 * - driverId: string (optional)
 * - inspectionId: string (optional)
 * - incidentId: string (optional)
 * - expiryDate: string (optional, ISO date)
 */
export async function POST(request: NextRequest) {
  try {
    // Autentifikacija
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as DocumentType;
    const loadId = formData.get('loadId') as string | null;
    const driverId = formData.get('driverId') as string | null;
    const inspectionId = formData.get('inspectionId') as string | null;
    const incidentId = formData.get('incidentId') as string | null;
    const expiryDateStr = formData.get('expiryDate') as string | null;

    // Validacija
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    // Validacija da bar jedan entity ID postoji (loadId ili driverId)
    // OPCIONO: možete dozvoliti i dokumente bez asocijacija
    // if (!loadId && !driverId) {
    //   return NextResponse.json(
    //     { error: 'Either loadId or driverId is required' },
    //     { status: 400 }
    //   );
    // }

    // Ako je load dokument, provjeri da li load postoji
    if (loadId) {
      const load = await prisma.load.findUnique({
        where: { id: loadId },
      });

      if (!load) {
        return NextResponse.json({ error: 'Load not found' }, { status: 404 });
      }
    }

    // Ako je driver dokument, provjeri da li driver postoji
    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }
    }

    if (inspectionId) {
      const inspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
      });
      if (!inspection) {
        return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
      }
      if (decoded.role === 'DRIVER' && inspection.driverId !== decoded.driverId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }
    }

    if (incidentId) {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });
      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }
      if (decoded.role === 'DRIVER' && incident.driverId !== decoded.driverId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }
    }

    // Process upload - sačuvaj na disk
    const entityId = loadId || driverId || inspectionId || incidentId || undefined;
    const uploadResult = await processUpload(file, type, entityId);

    // Parse expiry date ako postoji
    let expiryDate: Date | null = null;
    if (expiryDateStr) {
      expiryDate = new Date(expiryDateStr);
      if (isNaN(expiryDate.getTime())) {
        expiryDate = null;
      }
    }

    // Kreiraj document record u bazi
    const document = await prisma.document.create({
      data: {
        type,
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        expiryDate,
        loadId: loadId || undefined,
        driverId: driverId || undefined,
        inspectionId: inspectionId || undefined,
        incidentId: incidentId || undefined,
        uploadedById: decoded.userId,
      },
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
    });

    // Pošalji Telegram notifikaciju za upload dokumenta
    try {
      // Dobij podatke o korisniku koji je uploadovao
      const uploader = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          firstName: true,
          lastName: true,
        },
      });

      const uploaderName = uploader
        ? `${uploader.firstName} ${uploader.lastName}`
        : 'Unknown';

      // Ako je dokument vezan za load, pošalji notifikaciju
      if (document.load) {
        const message = createDocumentUploadedNotification({
          loadNumber: document.load.loadNumber,
          documentType: type,
          uploadedBy: uploaderName,
          fileName: document.fileName,
        });

        await sendAdminNotification(message);
      }
    } catch (notifError) {
      // Ne blokiraj API ako notifikacija ne uspije
      console.error('Greška pri slanju Telegram notifikacije:', notifError);
    }

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}
