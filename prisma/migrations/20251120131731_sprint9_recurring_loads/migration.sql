-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "RecurringLoadTemplate" (
    "id" TEXT NOT NULL,
    "recurringGroupId" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupState" TEXT NOT NULL,
    "pickupZip" TEXT NOT NULL,
    "pickupContactName" TEXT NOT NULL,
    "pickupContactPhone" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryState" TEXT NOT NULL,
    "deliveryZip" TEXT NOT NULL,
    "deliveryContactName" TEXT NOT NULL,
    "deliveryContactPhone" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "deadheadMiles" INTEGER NOT NULL DEFAULT 0,
    "loadRate" DOUBLE PRECISION NOT NULL,
    "customRatePerMile" DOUBLE PRECISION,
    "detentionTime" INTEGER,
    "detentionPay" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "specialInstructions" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "driverId" TEXT,
    "truckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "RecurringLoadTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringLoadTemplate_recurringGroupId_key" ON "RecurringLoadTemplate"("recurringGroupId");

-- CreateIndex
CREATE INDEX "RecurringLoadTemplate_recurringGroupId_idx" ON "RecurringLoadTemplate"("recurringGroupId");

-- CreateIndex
CREATE INDEX "RecurringLoadTemplate_frequency_idx" ON "RecurringLoadTemplate"("frequency");

-- CreateIndex
CREATE INDEX "RecurringLoadTemplate_isActive_idx" ON "RecurringLoadTemplate"("isActive");

-- AddForeignKey
ALTER TABLE "RecurringLoadTemplate" ADD CONSTRAINT "RecurringLoadTemplate_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringLoadTemplate" ADD CONSTRAINT "RecurringLoadTemplate_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
