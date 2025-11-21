-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'VACATION', 'SICK_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'OVERSIZED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOL', 'POD', 'DAMAGE_REPORT', 'LOAD_PHOTO', 'RATE_CONFIRMATION', 'FUEL_RECEIPT', 'CDL_LICENSE', 'MEDICAL_CARD', 'INSURANCE', 'REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'GENERAL_REPAIR', 'INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FUEL', 'TOLLS', 'REPAIRS', 'MAINTENANCE', 'INSURANCE', 'REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'DOCUMENT_UPLOAD', 'ASSIGNMENT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('USER', 'DRIVER', 'TRUCK', 'LOAD', 'DOCUMENT', 'PAY_STUB', 'MAINTENANCE', 'EXPENSE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "cdlNumber" TEXT NOT NULL,
    "cdlState" TEXT NOT NULL,
    "cdlExpiry" TIMESTAMP(3) NOT NULL,
    "endorsements" TEXT[],
    "medicalCardExpiry" TIMESTAMP(3) NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "ratePerMile" DOUBLE PRECISION NOT NULL DEFAULT 0.60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "truckNumber" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "registrationExpiry" TIMESTAMP(3) NOT NULL,
    "insuranceProvider" TEXT NOT NULL,
    "insurancePolicyNo" TEXT NOT NULL,
    "insuranceExpiry" TIMESTAMP(3) NOT NULL,
    "currentMileage" INTEGER NOT NULL DEFAULT 0,
    "maxSmallCars" INTEGER NOT NULL DEFAULT 8,
    "maxMediumCars" INTEGER NOT NULL DEFAULT 6,
    "maxLargeCars" INTEGER NOT NULL DEFAULT 4,
    "maxOversized" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "primaryDriverId" TEXT,
    "backupDriverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "loadNumber" TEXT NOT NULL,
    "driverId" TEXT,
    "truckId" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'AVAILABLE',
    "pickupAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupState" TEXT NOT NULL,
    "pickupZip" TEXT NOT NULL,
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "scheduledPickupDate" TIMESTAMP(3) NOT NULL,
    "actualPickupDate" TIMESTAMP(3),
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryState" TEXT NOT NULL,
    "deliveryZip" TEXT NOT NULL,
    "deliveryContactName" TEXT NOT NULL,
    "deliveryContactPhone" TEXT NOT NULL,
    "scheduledDeliveryDate" TIMESTAMP(3) NOT NULL,
    "actualDeliveryDate" TIMESTAMP(3),
    "distance" INTEGER NOT NULL,
    "deadheadMiles" INTEGER NOT NULL DEFAULT 0,
    "loadRate" DOUBLE PRECISION NOT NULL,
    "customRatePerMile" DOUBLE PRECISION,
    "detentionTime" INTEGER,
    "detentionPay" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "specialInstructions" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "size" "VehicleSize" NOT NULL,
    "isOperable" BOOLEAN NOT NULL DEFAULT true,
    "damageNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "loadId" TEXT,
    "driverId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayStub" (
    "id" TEXT NOT NULL,
    "stubNumber" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalMiles" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "avgRatePerMile" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TIMESTAMP(3),
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayStub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "performedDate" TIMESTAMP(3) NOT NULL,
    "mileageAtService" INTEGER NOT NULL,
    "nextServiceDue" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruckExpense" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruckExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationPeriod" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "Driver_userId_idx" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_truckNumber_key" ON "Truck"("truckNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_vin_key" ON "Truck"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_primaryDriverId_key" ON "Truck"("primaryDriverId");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_backupDriverId_key" ON "Truck"("backupDriverId");

-- CreateIndex
CREATE INDEX "Truck_truckNumber_idx" ON "Truck"("truckNumber");

-- CreateIndex
CREATE INDEX "Truck_isActive_idx" ON "Truck"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Load_loadNumber_key" ON "Load"("loadNumber");

-- CreateIndex
CREATE INDEX "Load_loadNumber_idx" ON "Load"("loadNumber");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_driverId_idx" ON "Load"("driverId");

-- CreateIndex
CREATE INDEX "Load_truckId_idx" ON "Load"("truckId");

-- CreateIndex
CREATE INDEX "Vehicle_loadId_idx" ON "Vehicle"("loadId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_loadId_idx" ON "Document"("loadId");

-- CreateIndex
CREATE INDEX "Document_driverId_idx" ON "Document"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "PayStub_stubNumber_key" ON "PayStub"("stubNumber");

-- CreateIndex
CREATE INDEX "PayStub_driverId_idx" ON "PayStub"("driverId");

-- CreateIndex
CREATE INDEX "PayStub_isPaid_idx" ON "PayStub"("isPaid");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_truckId_idx" ON "MaintenanceRecord"("truckId");

-- CreateIndex
CREATE INDEX "TruckExpense_truckId_idx" ON "TruckExpense"("truckId");

-- CreateIndex
CREATE INDEX "TruckExpense_type_idx" ON "TruckExpense"("type");

-- CreateIndex
CREATE INDEX "VacationPeriod_driverId_idx" ON "VacationPeriod"("driverId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_primaryDriverId_fkey" FOREIGN KEY ("primaryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_backupDriverId_fkey" FOREIGN KEY ("backupDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayStub" ADD CONSTRAINT "PayStub_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckExpense" ADD CONSTRAINT "TruckExpense_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationPeriod" ADD CONSTRAINT "VacationPeriod_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
