-- CreateEnum
CREATE TYPE "LandmarkType" AS ENUM ('FUEL_STATION', 'TERMINAL', 'PORT', 'WAREHOUSE', 'CAR_DEALERSHIP', 'COMPANY', 'OTHER');

-- CreateTable
CREATE TABLE "Landmark" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LandmarkType" NOT NULL,
    "description" TEXT,
    "companyName" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "country" TEXT DEFAULT 'BA',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "iconColor" TEXT DEFAULT '#3B82F6',
    "showLabel" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Landmark_type_idx" ON "Landmark"("type");

-- CreateIndex
CREATE INDEX "Landmark_isActive_idx" ON "Landmark"("isActive");

-- CreateIndex
CREATE INDEX "Landmark_city_idx" ON "Landmark"("city");

-- CreateIndex
CREATE INDEX "Landmark_latitude_longitude_idx" ON "Landmark"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Landmark_createdById_idx" ON "Landmark"("createdById");

-- AddForeignKey
ALTER TABLE "Landmark" ADD CONSTRAINT "Landmark_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
