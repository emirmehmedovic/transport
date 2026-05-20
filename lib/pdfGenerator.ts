import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { formatCurrency, formatDate, LoadWageDetail } from './wageCalculator';

export interface PayStubData {
  stubNumber: string;
  driver: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  periodStart: Date;
  periodEnd: Date;
  totalMiles: number;
  totalAmount: number;
  avgRatePerMile: number;
  loads: LoadWageDetail[];
}

export interface DriverBorderCrossingReportData {
  driverName: string;
  generatedAt: Date;
  windowFrom?: Date | null;
  schengenFrom: Date;
  schengenTo: Date;
  usedDays: number;
  remainingDays: number;
  borderCrossings: Array<{
    type: "EXIT_BIH" | "ENTRY_BIH";
    recordedAt: Date;
    latitude?: number | null;
    longitude?: number | null;
    nearestBorderCrossing?: {
      name: string;
      distanceMeters?: number | null;
    } | null;
  }>;
}

const PDFKIT_FONT_PATHS = {
  regular: path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf'),
  bold: path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf'),
} as const;

function ensureFontExists(fontPath: string) {
  if (!existsSync(fontPath)) {
    throw new Error(`PDF font file missing: ${fontPath}`);
  }
  return fontPath;
}

function regularFont() {
  return ensureFontExists(PDFKIT_FONT_PATHS.regular);
}

function boldFont() {
  return ensureFontExists(PDFKIT_FONT_PATHS.bold);
}

/**
 * Generiše pay stub PDF
 *
 * @param payStubData - Podaci za pay stub
 * @returns relativni path do PDF file-a
 */
export async function generatePayStubPDF(
  payStubData: PayStubData
): Promise<string> {
  // Ensure pay-stubs folder exists
  const uploadDir = path.join(process.cwd(), 'uploads', 'pay-stubs');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // PDF file path
  const fileName = `${payStubData.stubNumber}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  const relativePath = path.join('pay-stubs', fileName);

  // Create PDF document
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    font: regularFont(),
  });

  // Pipe to file
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc
    .fontSize(24)
    .font(boldFont())
    .text('PAY STUB', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(12)
    .font(regularFont())
    .text('Transport Management System', { align: 'center' })
    .moveDown(2);

  // Stub Number & Date
  doc
    .fontSize(10)
    .font(boldFont())
    .text(`Stub Number: ${payStubData.stubNumber}`, 50, 120)
    .font(regularFont())
    .text(`Generated: ${formatDate(new Date())}`, 50, 135)
    .moveDown(1);

  // Driver Info Section
  const startY = 160;
  doc
    .fontSize(14)
    .font(boldFont())
    .text('Driver Information', 50, startY)
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font(regularFont())
    .text(
      `Name: ${payStubData.driver.firstName} ${payStubData.driver.lastName}`,
      50
    )
    .text(`Email: ${payStubData.driver.email}`, 50)
    .text(`Phone: ${payStubData.driver.phone || 'N/A'}`, 50)
    .moveDown(1);

  // Period Section
  doc
    .fontSize(14)
    .font(boldFont())
    .text('Pay Period', 50)
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font(regularFont())
    .text(`From: ${formatDate(payStubData.periodStart)}`, 50)
    .text(`To: ${formatDate(payStubData.periodEnd)}`, 50)
    .moveDown(2);

  // Loads Table
  doc.fontSize(14).font(boldFont()).text('Loads Summary', 50).moveDown(0.5);

  // Table Header
  const tableTop = doc.y;
  const col1 = 50; // Load #
  const col2 = 120; // Pickup Date
  const col3 = 200; // Delivery Date
  const col4 = 280; // Kilometri
  const col5 = 340; // Rate
  const col6 = 400; // Detention
  const col7 = 480; // Total

  doc
    .fontSize(9)
    .font(boldFont())
    .text('Load #', col1, tableTop)
    .text('Pickup', col2, tableTop)
    .text('Delivery', col3, tableTop)
    .text('Kilometri', col4, tableTop)
    .text('Cijena/km', col5, tableTop)
    .text('Detention', col6, tableTop)
    .text('Total', col7, tableTop);

  // Draw line under header
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(560, tableTop + 15)
    .stroke();

  // Table Rows
  let yPosition = tableTop + 25;
  doc.fontSize(8).font(regularFont());

  payStubData.loads.forEach((load, index) => {
    // Check if we need a new page
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    const pickupDate = formatDate(load.pickupDate);
    const deliveryDate = formatDate(load.deliveryDate);

    doc
      .text(load.loadNumber, col1, yPosition, { width: 65 })
      .text(pickupDate, col2, yPosition, { width: 75 })
      .text(deliveryDate, col3, yPosition, { width: 75 })
      .text(load.totalMiles.toString(), col4, yPosition, { width: 55 })
      .text(`${load.ratePerMile.toFixed(2)} KM/km`, col5, yPosition, { width: 55 })
      .text(formatCurrency(load.detentionPay), col6, yPosition, { width: 75 })
      .text(formatCurrency(load.totalPayment), col7, yPosition, { width: 75 });

    yPosition += 20;
  });

  // Draw line after table
  yPosition += 10;
  doc.moveTo(50, yPosition).lineTo(560, yPosition).stroke();

  // Summary Section
  yPosition += 20;
  doc.fontSize(12).font(boldFont()).text('Summary', 50, yPosition);

  yPosition += 25;
  doc.fontSize(10).font(regularFont());

  const summaryCol1 = 350;
  const summaryCol2 = 480;

  doc
    .text('Total Loads:', summaryCol1, yPosition)
    .font(boldFont())
    .text(payStubData.loads.length.toString(), summaryCol2, yPosition);

  yPosition += 20;
  doc
    .font(regularFont())
    .text('Ukupno km:', summaryCol1, yPosition)
    .font(boldFont())
    .text(payStubData.totalMiles.toString(), summaryCol2, yPosition);

  yPosition += 20;
  doc
    .font(regularFont())
    .text('Prosječna cijena po km:', summaryCol1, yPosition)
    .font(boldFont())
    .text(`${payStubData.avgRatePerMile.toFixed(3)} KM/km`, summaryCol2, yPosition);

  yPosition += 25;
  doc
    .fontSize(12)
    .font(boldFont())
    .text('TOTAL AMOUNT:', summaryCol1, yPosition)
    .fontSize(14)
    .text(formatCurrency(payStubData.totalAmount), summaryCol2, yPosition);

  // Footer
  const footerY = 720;
  doc
    .fontSize(8)
    .font(regularFont())
    .text(
      'This document is computer-generated and does not require a signature.',
      50,
      footerY,
      { align: 'center' }
    );

  doc
    .text('Generated with Claude Code - Transport Management System', 50, footerY + 15, {
      align: 'center',
    });

  // Finalize PDF
  doc.end();

  // Wait for stream to finish
  await new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(undefined));
    stream.on('error', reject);
  });

  return relativePath;
}

export async function generateDriverBorderCrossingPDFBuffer(
  reportData: DriverBorderCrossingReportData
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    font: regularFont(),
  });

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc
      .fontSize(20)
      .font(boldFont())
      .text('IZVJESTAJ PRELAZAKA GRANICE', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font(regularFont())
      .text(`Vozac: ${reportData.driverName}`)
      .text(`Generisano: ${formatDate(reportData.generatedAt)}`)
      .text(
        `Schengen period: ${formatDate(reportData.schengenFrom)} - ${formatDate(reportData.schengenTo)}`
      )
      .text(`Iskoristeno dana: ${reportData.usedDays}`)
      .text(`Preostalo dana: ${reportData.remainingDays}`);

    if (reportData.windowFrom) {
      doc.text(`GPS historija za prelaze od: ${formatDate(reportData.windowFrom)}`);
    }

    doc.moveDown(1.5);
    doc.fontSize(14).font(boldFont()).text('Prelazi').moveDown(0.5);

    const col1 = 50;
    const col2 = 145;
    const col3 = 290;
    const col4 = 440;
    let y = doc.y;

    doc
      .fontSize(9)
      .font(boldFont())
      .text('Dogadjaj', col1, y)
      .text('Datum i vrijeme', col2, y)
      .text('Lokacija', col3, y)
      .text('Koordinate', col4, y);

    y += 15;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 10;

    if (reportData.borderCrossings.length === 0) {
      doc.font(regularFont()).fontSize(10).text('Nema evidentiranih prelazaka granice.', 50, y);
      doc.end();
      return;
    }

    for (const crossing of reportData.borderCrossings) {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      const location = crossing.nearestBorderCrossing?.name || 'Nepoznata lokacija';
      const coords =
        crossing.latitude !== null &&
        crossing.latitude !== undefined &&
        crossing.longitude !== null &&
        crossing.longitude !== undefined
          ? `${crossing.latitude.toFixed(5)}, ${crossing.longitude.toFixed(5)}`
          : '-';

      doc
        .fontSize(9)
        .font(regularFont())
        .text(crossing.type === "EXIT_BIH" ? "Izlaz iz BiH" : "Ulaz u BiH", col1, y, { width: 85 })
        .text(formatDate(crossing.recordedAt) + " " + crossing.recordedAt.toLocaleTimeString("bs-BA", {
          hour: "2-digit",
          minute: "2-digit",
        }), col2, y, { width: 130 })
        .text(location, col3, y, { width: 135 })
        .text(coords, col4, y, { width: 100 });

      if (crossing.nearestBorderCrossing?.distanceMeters !== undefined && crossing.nearestBorderCrossing?.distanceMeters !== null) {
        y += 12;
        doc
          .fontSize(8)
          .fillColor('#6b7280')
          .text(`Najblizi prelaz, udaljenost ${crossing.nearestBorderCrossing.distanceMeters} m`, col3, y, {
            width: 180,
          })
          .fillColor('black');
      }

      y += 24;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke().strokeColor('black');
      y += 8;
    }

    doc.end();
  });
}
