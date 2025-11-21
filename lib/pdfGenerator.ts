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
  });

  // Pipe to file
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('PAY STUB', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(12)
    .font('Helvetica')
    .text('Transport Management System', { align: 'center' })
    .moveDown(2);

  // Stub Number & Date
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Stub Number: ${payStubData.stubNumber}`, 50, 120)
    .font('Helvetica')
    .text(`Generated: ${formatDate(new Date())}`, 50, 135)
    .moveDown(1);

  // Driver Info Section
  const startY = 160;
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('Driver Information', 50, startY)
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica')
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
    .font('Helvetica-Bold')
    .text('Pay Period', 50)
    .moveDown(0.5);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`From: ${formatDate(payStubData.periodStart)}`, 50)
    .text(`To: ${formatDate(payStubData.periodEnd)}`, 50)
    .moveDown(2);

  // Loads Table
  doc.fontSize(14).font('Helvetica-Bold').text('Loads Summary', 50).moveDown(0.5);

  // Table Header
  const tableTop = doc.y;
  const col1 = 50; // Load #
  const col2 = 120; // Pickup Date
  const col3 = 200; // Delivery Date
  const col4 = 280; // Miles
  const col5 = 340; // Rate
  const col6 = 400; // Detention
  const col7 = 480; // Total

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('Load #', col1, tableTop)
    .text('Pickup', col2, tableTop)
    .text('Delivery', col3, tableTop)
    .text('Miles', col4, tableTop)
    .text('Rate', col5, tableTop)
    .text('Detention', col6, tableTop)
    .text('Total', col7, tableTop);

  // Draw line under header
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(560, tableTop + 15)
    .stroke();

  // Table Rows
  let yPosition = tableTop + 25;
  doc.fontSize(8).font('Helvetica');

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
      .text(`$${load.ratePerMile.toFixed(2)}`, col5, yPosition, { width: 55 })
      .text(formatCurrency(load.detentionPay), col6, yPosition, { width: 75 })
      .text(formatCurrency(load.totalPayment), col7, yPosition, { width: 75 });

    yPosition += 20;
  });

  // Draw line after table
  yPosition += 10;
  doc.moveTo(50, yPosition).lineTo(560, yPosition).stroke();

  // Summary Section
  yPosition += 20;
  doc.fontSize(12).font('Helvetica-Bold').text('Summary', 50, yPosition);

  yPosition += 25;
  doc.fontSize(10).font('Helvetica');

  const summaryCol1 = 350;
  const summaryCol2 = 480;

  doc
    .text('Total Loads:', summaryCol1, yPosition)
    .font('Helvetica-Bold')
    .text(payStubData.loads.length.toString(), summaryCol2, yPosition);

  yPosition += 20;
  doc
    .font('Helvetica')
    .text('Total Miles:', summaryCol1, yPosition)
    .font('Helvetica-Bold')
    .text(payStubData.totalMiles.toString(), summaryCol2, yPosition);

  yPosition += 20;
  doc
    .font('Helvetica')
    .text('Average Rate per Mile:', summaryCol1, yPosition)
    .font('Helvetica-Bold')
    .text(`$${payStubData.avgRatePerMile.toFixed(3)}`, summaryCol2, yPosition);

  yPosition += 25;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .text('TOTAL AMOUNT:', summaryCol1, yPosition)
    .fontSize(14)
    .text(formatCurrency(payStubData.totalAmount), summaryCol2, yPosition);

  // Footer
  const footerY = 720;
  doc
    .fontSize(8)
    .font('Helvetica')
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
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return relativePath;
}
