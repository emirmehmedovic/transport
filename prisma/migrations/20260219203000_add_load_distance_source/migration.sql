-- Add distance source enum and column for load kilometraza provenance
CREATE TYPE "LoadDistanceSource" AS ENUM ('MANUAL', 'AUTO');

ALTER TABLE "Load"
  ADD COLUMN "distanceSource" "LoadDistanceSource" NOT NULL DEFAULT 'MANUAL';

CREATE INDEX "Load_distanceSource_idx" ON "Load"("distanceSource");
