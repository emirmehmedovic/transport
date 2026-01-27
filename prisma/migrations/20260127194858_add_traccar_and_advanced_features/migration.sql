-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('PICKUP', 'DELIVERY', 'DEPOT', 'REST_AREA', 'BORDER_CROSSING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GeofenceEventType" AS ENUM ('ENTRY', 'EXIT');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "traccarDeviceId" TEXT;

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION DEFAULT 0,
    "bearing" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "battery" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLon" DOUBLE PRECISION NOT NULL,
    "radius" INTEGER NOT NULL,
    "type" "ZoneType" NOT NULL DEFAULT 'CUSTOM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnEntry" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnExit" BOOLEAN NOT NULL DEFAULT true,
    "loadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "eventType" "GeofenceEventType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_driverId_idx" ON "Position"("driverId");

-- CreateIndex
CREATE INDEX "Position_deviceId_idx" ON "Position"("deviceId");

-- CreateIndex
CREATE INDEX "Position_recordedAt_idx" ON "Position"("recordedAt");

-- CreateIndex
CREATE INDEX "Position_driverId_recordedAt_idx" ON "Position"("driverId", "recordedAt");

-- CreateIndex
CREATE INDEX "Zone_type_idx" ON "Zone"("type");

-- CreateIndex
CREATE INDEX "Zone_isActive_idx" ON "Zone"("isActive");

-- CreateIndex
CREATE INDEX "Zone_loadId_idx" ON "Zone"("loadId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_zoneId_idx" ON "GeofenceEvent"("zoneId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_driverId_idx" ON "GeofenceEvent"("driverId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_detectedAt_idx" ON "GeofenceEvent"("detectedAt");

-- CreateIndex
CREATE INDEX "GeofenceEvent_driverId_detectedAt_idx" ON "GeofenceEvent"("driverId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_traccarDeviceId_key" ON "Driver"("traccarDeviceId");

-- CreateIndex
CREATE INDEX "Driver_traccarDeviceId_idx" ON "Driver"("traccarDeviceId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

