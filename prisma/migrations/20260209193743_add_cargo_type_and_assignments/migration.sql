/*
  Warnings:

  - A unique constraint covering the columns `[ntsDeviceId]` on the table `Truck` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LoadStopType" AS ENUM ('PICKUP', 'DELIVERY', 'INTERMEDIATE');

-- CreateEnum
CREATE TYPE "LoadCargoType" AS ENUM ('LABUDICA', 'CISTERNA', 'TERET');

-- CreateEnum
CREATE TYPE "TollPermitType" AS ENUM ('VIGNETTE', 'TOLLBOX', 'PERMIT', 'EMISSION_ZONE', 'OTHER');

-- CreateEnum
CREATE TYPE "TollPermitStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PRE_TRIP', 'POST_TRIP');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SAFE', 'UNSAFE', 'NEEDS_REPAIR');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'INSPECTION_PHOTO';
ALTER TYPE "DocumentType" ADD VALUE 'INCIDENT_PHOTO';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "incidentId" TEXT,
ADD COLUMN     "inspectionId" TEXT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "schengenManualAsOf" TIMESTAMP(3),
ADD COLUMN     "schengenManualRemainingDays" INTEGER;

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "cargoType" "LoadCargoType" NOT NULL DEFAULT 'TERET',
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "estimatedDurationHours" DOUBLE PRECISION,
ADD COLUMN     "inTransitAt" TIMESTAMP(3),
ADD COLUMN     "routeName" TEXT;

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "ntsDeviceId" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "pickupStopSequence" INTEGER;

-- CreateTable
CREATE TABLE "Trailer" (
    "id" TEXT NOT NULL,
    "trailerNumber" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "licensePlate" TEXT,
    "registrationExpiry" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentMileage" INTEGER NOT NULL DEFAULT 0,
    "currentTruckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionStatus" NOT NULL,
    "checklist" JSONB,
    "driverId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "trailerId" TEXT,
    "odometer" INTEGER,
    "defects" BOOLEAN NOT NULL DEFAULT false,
    "defectNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "trailerId" TEXT,
    "loadId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MINOR',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "claimNumber" TEXT,
    "amount" DOUBLE PRECISION DEFAULT 0,
    "status" "ClaimStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "vatNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TollPermit" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT,
    "type" "TollPermitType" NOT NULL,
    "status" "TollPermitStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT,
    "referenceNo" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TollPermit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadStop" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "type" "LoadStopType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "items" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadCargoItem" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "pickupStopSequence" INTEGER,
    "name" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "weightKg" DOUBLE PRECISION,
    "volumeLiters" DOUBLE PRECISION,
    "volumeM3" DOUBLE PRECISION,
    "pallets" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadCargoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchengenDay" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "inSchengen" BOOLEAN NOT NULL DEFAULT false,
    "positionCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchengenDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertAcknowledgement" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedById" TEXT,

    CONSTRAINT "AlertAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_trailerNumber_key" ON "Trailer"("trailerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_vin_key" ON "Trailer"("vin");

-- CreateIndex
CREATE INDEX "Trailer_trailerNumber_idx" ON "Trailer"("trailerNumber");

-- CreateIndex
CREATE INDEX "Trailer_currentTruckId_idx" ON "Trailer"("currentTruckId");

-- CreateIndex
CREATE INDEX "Inspection_driverId_idx" ON "Inspection"("driverId");

-- CreateIndex
CREATE INDEX "Inspection_truckId_idx" ON "Inspection"("truckId");

-- CreateIndex
CREATE INDEX "Inspection_trailerId_idx" ON "Inspection"("trailerId");

-- CreateIndex
CREATE INDEX "Inspection_type_idx" ON "Inspection"("type");

-- CreateIndex
CREATE INDEX "Inspection_status_idx" ON "Inspection"("status");

-- CreateIndex
CREATE INDEX "Inspection_createdAt_idx" ON "Inspection"("createdAt");

-- CreateIndex
CREATE INDEX "Incident_driverId_idx" ON "Incident"("driverId");

-- CreateIndex
CREATE INDEX "Incident_truckId_idx" ON "Incident"("truckId");

-- CreateIndex
CREATE INDEX "Incident_trailerId_idx" ON "Incident"("trailerId");

-- CreateIndex
CREATE INDEX "Incident_loadId_idx" ON "Incident"("loadId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE INDEX "Incident_occurredAt_idx" ON "Incident"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_claimNumber_key" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_incidentId_idx" ON "Claim"("incidentId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "TollPermit_truckId_idx" ON "TollPermit"("truckId");

-- CreateIndex
CREATE INDEX "TollPermit_countryCode_idx" ON "TollPermit"("countryCode");

-- CreateIndex
CREATE INDEX "TollPermit_type_idx" ON "TollPermit"("type");

-- CreateIndex
CREATE INDEX "TollPermit_status_idx" ON "TollPermit"("status");

-- CreateIndex
CREATE INDEX "TollPermit_validTo_idx" ON "TollPermit"("validTo");

-- CreateIndex
CREATE INDEX "LoadStop_loadId_idx" ON "LoadStop"("loadId");

-- CreateIndex
CREATE INDEX "LoadStop_type_idx" ON "LoadStop"("type");

-- CreateIndex
CREATE INDEX "LoadStop_sequence_idx" ON "LoadStop"("sequence");

-- CreateIndex
CREATE INDEX "LoadCargoItem_loadId_idx" ON "LoadCargoItem"("loadId");

-- CreateIndex
CREATE INDEX "LoadCargoItem_pickupStopSequence_idx" ON "LoadCargoItem"("pickupStopSequence");

-- CreateIndex
CREATE INDEX "SchengenDay_driverId_idx" ON "SchengenDay"("driverId");

-- CreateIndex
CREATE INDEX "SchengenDay_date_idx" ON "SchengenDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SchengenDay_driverId_date_key" ON "SchengenDay"("driverId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AlertAcknowledgement_alertId_key" ON "AlertAcknowledgement"("alertId");

-- CreateIndex
CREATE INDEX "AlertAcknowledgement_acknowledgedAt_idx" ON "AlertAcknowledgement"("acknowledgedAt");

-- CreateIndex
CREATE INDEX "Document_inspectionId_idx" ON "Document"("inspectionId");

-- CreateIndex
CREATE INDEX "Document_incidentId_idx" ON "Document"("incidentId");

-- CreateIndex
CREATE INDEX "Load_actualDeliveryDate_idx" ON "Load"("actualDeliveryDate");

-- CreateIndex
CREATE INDEX "Load_scheduledDeliveryDate_idx" ON "Load"("scheduledDeliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_ntsDeviceId_key" ON "Truck"("ntsDeviceId");

-- CreateIndex
CREATE INDEX "Vehicle_pickupStopSequence_idx" ON "Vehicle"("pickupStopSequence");

-- AddForeignKey
ALTER TABLE "Trailer" ADD CONSTRAINT "Trailer_currentTruckId_fkey" FOREIGN KEY ("currentTruckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TollPermit" ADD CONSTRAINT "TollPermit_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadStop" ADD CONSTRAINT "LoadStop_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadCargoItem" ADD CONSTRAINT "LoadCargoItem_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchengenDay" ADD CONSTRAINT "SchengenDay_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertAcknowledgement" ADD CONSTRAINT "AlertAcknowledgement_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
