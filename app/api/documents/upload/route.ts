import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processUpload, DocumentType } from '@/lib/fileUpload';
import { getVerifiedAuthUserFromRequest } from '@/lib/api-auth';
import {
  sendAdminNotification,
  createDocumentUploadedNotification,
} from '@/lib/telegram';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const decoded = await getVerifiedAuthUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Nevažeća autentifikacija' }, { status: 401 });
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
      return NextResponse.json({ error: 'Datoteka je obavezna' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Tip dokumenta je obavezan' }, { status: 400 });
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
        select: {
          id: true,
          driverId: true,
          requestedByUserId: true,
        },
      });

      if (!load) {
        return NextResponse.json({ error: 'Load nije pronađen' }, { status: 404 });
      }

      if (decoded.role === 'DRIVER' && load.driverId !== decoded.driverId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }

      if (decoded.role === 'CLIENT' && load.requestedByUserId !== decoded.userId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }
    }

    // Ako je driver dokument, provjeri da li driver postoji
    if (driverId) {
      if (decoded.role === 'CLIENT') {
        return NextResponse.json({ error: 'Klijent ne može direktno uploadovati dokument na vozača' }, { status: 403 });
      }

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return NextResponse.json({ error: 'Vozač nije pronađen' }, { status: 404 });
      }

      if (decoded.role === 'DRIVER' && driver.id !== decoded.driverId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }
    }

    if (inspectionId) {
      if (decoded.role === 'CLIENT') {
        return NextResponse.json({ error: 'Klijent ne može direktno uploadovati dokument na inspekciju' }, { status: 403 });
      }

      const inspection = await prisma.inspection.findUnique({
        where: { id: inspectionId },
      });
      if (!inspection) {
        return NextResponse.json({ error: 'Inspekcija nije pronađena' }, { status: 404 });
      }
      if (decoded.role === 'DRIVER' && inspection.driverId !== decoded.driverId) {
        return NextResponse.json({ error: 'Nemate dozvolu' }, { status: 403 });
      }
    }

    if (incidentId) {
      if (decoded.role === 'CLIENT') {
        return NextResponse.json({ error: 'Klijent ne može direktno uploadovati dokument na incident' }, { status: 403 });
      }

      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });
      if (!incident) {
        return NextResponse.json({ error: 'Incident nije pronađen' }, { status: 404 });
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
        : 'Nepoznat korisnik';

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
      message: 'Dokument je uspješno uploadovan',
      document,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload dokumenta nije uspio' },
      { status: 500 }
    );
  }
}
