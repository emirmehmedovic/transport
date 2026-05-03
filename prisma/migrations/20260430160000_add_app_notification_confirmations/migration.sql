ALTER TABLE "AppNotification"
ADD COLUMN "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "confirmedAt" TIMESTAMP(3);
