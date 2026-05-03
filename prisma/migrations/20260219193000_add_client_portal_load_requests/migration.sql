-- Add CLIENT role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CLIENT';

-- New enums for load source and approval workflow
CREATE TYPE "LoadSourceType" AS ENUM ('INTERNAL', 'CLIENT_PORTAL');
CREATE TYPE "LoadApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- Load workflow fields
ALTER TABLE "Load"
  ADD COLUMN "sourceType" "LoadSourceType" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "approvalStatus" "LoadApprovalStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "requestedByUserId" TEXT,
  ADD COLUMN "requestedAt" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "approvalNote" TEXT;

-- Client profile
CREATE TABLE "ClientProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT,
  "companyAddress" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "contactPerson" TEXT,
  "contactPhone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");
CREATE INDEX "ClientProfile_companyName_idx" ON "ClientProfile"("companyName");

CREATE INDEX "Load_approvalStatus_idx" ON "Load"("approvalStatus");
CREATE INDEX "Load_sourceType_idx" ON "Load"("sourceType");
CREATE INDEX "Load_requestedByUserId_idx" ON "Load"("requestedByUserId");

ALTER TABLE "Load"
  ADD CONSTRAINT "Load_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientProfile"
  ADD CONSTRAINT "ClientProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
