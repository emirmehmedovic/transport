CREATE TYPE "public"."DocumentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "public"."Document"
ADD COLUMN "approvalStatus" "public"."DocumentApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedById" TEXT;

CREATE INDEX "Document_approvalStatus_idx" ON "public"."Document"("approvalStatus");
