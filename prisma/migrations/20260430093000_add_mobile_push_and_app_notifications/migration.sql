CREATE TYPE "MobilePushPlatform" AS ENUM ('ANDROID', 'IOS', 'UNKNOWN');

CREATE TYPE "AppNotificationType" AS ENUM (
  'DRIVER_BORDER_EXIT_EU',
  'DRIVER_BORDER_RETURN_BIH',
  'DRIVER_SCHENGEN_REMINDER'
);

CREATE TABLE "MobilePushDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pushToken" TEXT NOT NULL,
  "platform" "MobilePushPlatform" NOT NULL DEFAULT 'ANDROID',
  "deviceName" TEXT,
  "appVersion" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRegisteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MobilePushDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "driverId" TEXT,
  "type" "AppNotificationType" NOT NULL,
  "notificationKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "pushSentAt" TIMESTAMP(3),
  "pushStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilePushDevice_pushToken_key" ON "MobilePushDevice"("pushToken");
CREATE INDEX "MobilePushDevice_userId_isActive_idx" ON "MobilePushDevice"("userId", "isActive");
CREATE INDEX "MobilePushDevice_lastSeenAt_idx" ON "MobilePushDevice"("lastSeenAt");

CREATE UNIQUE INDEX "AppNotification_notificationKey_key" ON "AppNotification"("notificationKey");
CREATE INDEX "AppNotification_userId_createdAt_idx" ON "AppNotification"("userId", "createdAt");
CREATE INDEX "AppNotification_driverId_createdAt_idx" ON "AppNotification"("driverId", "createdAt");
CREATE INDEX "AppNotification_type_createdAt_idx" ON "AppNotification"("type", "createdAt");

ALTER TABLE "MobilePushDevice"
ADD CONSTRAINT "MobilePushDevice_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppNotification"
ADD CONSTRAINT "AppNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppNotification"
ADD CONSTRAINT "AppNotification_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
