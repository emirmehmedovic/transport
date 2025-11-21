-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "lastKnownLatitude" DOUBLE PRECISION,
ADD COLUMN     "lastKnownLongitude" DOUBLE PRECISION,
ADD COLUMN     "lastLocationUpdate" TIMESTAMP(3);
