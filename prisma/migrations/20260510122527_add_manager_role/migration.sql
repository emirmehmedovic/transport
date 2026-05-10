-- CreateEnum
CREATE TYPE "ManagerStatus" AS ENUM ('ACTIVE', 'VACATION', 'INACTIVE');

-- AlterEnum
ALTER TYPE "AuditEntity" ADD VALUE 'MANAGER';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "GeofenceEvent" ADD COLUMN     "managerId" TEXT,
ALTER COLUMN "driverId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MobilePushDevice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "managerId" TEXT,
ALTER COLUMN "driverId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "status" "ManagerStatus" NOT NULL DEFAULT 'ACTIVE',
    "department" TEXT,
    "lastKnownLatitude" DOUBLE PRECISION,
    "lastKnownLongitude" DOUBLE PRECISION,
    "lastLocationUpdate" TIMESTAMP(3),
    "traccarDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_userId_key" ON "Manager"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_traccarDeviceId_key" ON "Manager"("traccarDeviceId");

-- CreateIndex
CREATE INDEX "Manager_userId_idx" ON "Manager"("userId");

-- CreateIndex
CREATE INDEX "Manager_status_idx" ON "Manager"("status");

-- CreateIndex
CREATE INDEX "Manager_traccarDeviceId_idx" ON "Manager"("traccarDeviceId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_managerId_idx" ON "GeofenceEvent"("managerId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_managerId_detectedAt_idx" ON "GeofenceEvent"("managerId", "detectedAt");

-- CreateIndex
CREATE INDEX "Position_managerId_idx" ON "Position"("managerId");

-- CreateIndex
CREATE INDEX "Position_managerId_recordedAt_idx" ON "Position"("managerId", "recordedAt");

-- AddForeignKey
ALTER TABLE "Manager" ADD CONSTRAINT "Manager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
