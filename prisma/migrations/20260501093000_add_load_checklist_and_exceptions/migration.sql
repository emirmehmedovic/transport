-- AlterTable
ALTER TABLE "public"."Load"
ADD COLUMN "checklist" JSONB,
ADD COLUMN "delayReason" TEXT,
ADD COLUMN "pickupExceptionReason" TEXT,
ADD COLUMN "deliveryExceptionReason" TEXT;
