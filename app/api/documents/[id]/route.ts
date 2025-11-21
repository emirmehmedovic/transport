import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { deleteFile } from '@/lib/fileUpload';

/**
 * GET /api/documents/[id]
 * Dohvati metadata dokumenta
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Dohvati dokument
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        load: {
          select: {
            id: true,
            loadNumber: true,
            status: true,
          },
        },
        driver: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Permission check - drivers mogu vidjeti samo svoje dokumente
    if (decoded.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: decoded.userId },
      });

      if (!driver || document.driverId !== driver.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Obriši dokument
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Permission check - samo Admin i Dispatcher mogu brisati
    if (decoded.role === 'DRIVER') {
      return NextResponse.json(
        { error: 'Forbidden - only admins and dispatchers can delete documents' },
        { status: 403 }
      );
    }

    // Dohvati dokument
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Obriši file sa diska
    try {
      await deleteFile(document.filePath);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
      // Nastavljamo sa brisanjem iz baze i ako file ne postoji
    }

    // Obriši iz baze
    await prisma.document.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
