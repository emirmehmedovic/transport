CREATE TYPE "public"."TrailerType" AS ENUM ('CISTERNA', 'CAR_HAULER', 'KOFERAS', 'OTHER');

ALTER TABLE "public"."Trailer"
ADD COLUMN "type" "public"."TrailerType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "lengthMeters" DOUBLE PRECISION,
ADD COLUMN "capacityM3" DOUBLE PRECISION,
ADD COLUMN "compartmentCount" INTEGER;
