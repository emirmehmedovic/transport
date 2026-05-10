-- CreateEnum
CREATE TYPE "RoutePlanStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoutePlanDayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppNotificationType" ADD VALUE 'ROUTE_PLAN_ASSIGNED';
ALTER TYPE "AppNotificationType" ADD VALUE 'ROUTE_PLAN_UPDATED';
ALTER TYPE "AppNotificationType" ADD VALUE 'ROUTE_PLAN_CANCELLED';

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'ROUTE_PLAN';

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "generatedFromRoutePlanId" TEXT;

-- CreateTable
CREATE TABLE "WeeklyRoutePlan" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "description" TEXT,
    "status" "RoutePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysOfWeek" "RoutePlanDayOfWeek"[],
    "cargoType" "LoadCargoType" NOT NULL DEFAULT 'TERET',
    "distance" INTEGER NOT NULL,
    "deadheadMiles" INTEGER NOT NULL DEFAULT 0,
    "loadRate" DOUBLE PRECISION NOT NULL,
    "customRatePerMile" DOUBLE PRECISION,
    "detentionTime" INTEGER,
    "detentionPay" DOUBLE PRECISION DEFAULT 0,
    "estimatedDurationHours" DOUBLE PRECISION,
    "driverId" TEXT,
    "truckId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "notes" TEXT,
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "WeeklyRoutePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePlanStop" (
    "id" TEXT NOT NULL,
    "routePlanId" TEXT NOT NULL,
    "type" "LoadStopType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "landmarkId" TEXT,
    "customAddress" TEXT,
    "customCity" TEXT,
    "customState" TEXT,
    "customZip" TEXT,
    "customLatitude" DOUBLE PRECISION,
    "customLongitude" DOUBLE PRECISION,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "scheduledTimeOffset" INTEGER,
    "items" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePlanStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_status_idx" ON "WeeklyRoutePlan"("status");

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_driverId_idx" ON "WeeklyRoutePlan"("driverId");

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_truckId_idx" ON "WeeklyRoutePlan"("truckId");

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_startDate_idx" ON "WeeklyRoutePlan"("startDate");

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_endDate_idx" ON "WeeklyRoutePlan"("endDate");

-- CreateIndex
CREATE INDEX "WeeklyRoutePlan_createdById_idx" ON "WeeklyRoutePlan"("createdById");

-- CreateIndex
CREATE INDEX "RoutePlanStop_routePlanId_idx" ON "RoutePlanStop"("routePlanId");

-- CreateIndex
CREATE INDEX "RoutePlanStop_landmarkId_idx" ON "RoutePlanStop"("landmarkId");

-- CreateIndex
CREATE INDEX "RoutePlanStop_sequence_idx" ON "RoutePlanStop"("sequence");

-- CreateIndex
CREATE INDEX "Load_generatedFromRoutePlanId_idx" ON "Load"("generatedFromRoutePlanId");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_generatedFromRoutePlanId_fkey" FOREIGN KEY ("generatedFromRoutePlanId") REFERENCES "WeeklyRoutePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRoutePlan" ADD CONSTRAINT "WeeklyRoutePlan_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRoutePlan" ADD CONSTRAINT "WeeklyRoutePlan_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRoutePlan" ADD CONSTRAINT "WeeklyRoutePlan_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRoutePlan" ADD CONSTRAINT "WeeklyRoutePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlanStop" ADD CONSTRAINT "RoutePlanStop_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "WeeklyRoutePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePlanStop" ADD CONSTRAINT "RoutePlanStop_landmarkId_fkey" FOREIGN KEY ("landmarkId") REFERENCES "Landmark"("id") ON DELETE SET NULL ON UPDATE CASCADE;
