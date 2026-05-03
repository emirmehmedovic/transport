-- New enum for client notifications
CREATE TYPE "ClientNotificationType" AS ENUM ('LOAD_PICKED_UP');

-- Client notifications table
CREATE TABLE "ClientNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "loadId" TEXT NOT NULL,
  "type" "ClientNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientNotification_userId_loadId_type_key"
  ON "ClientNotification"("userId", "loadId", "type");

CREATE INDEX "ClientNotification_userId_isRead_createdAt_idx"
  ON "ClientNotification"("userId", "isRead", "createdAt");

CREATE INDEX "ClientNotification_loadId_idx"
  ON "ClientNotification"("loadId");

ALTER TABLE "ClientNotification"
  ADD CONSTRAINT "ClientNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientNotification"
  ADD CONSTRAINT "ClientNotification_loadId_fkey"
  FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
