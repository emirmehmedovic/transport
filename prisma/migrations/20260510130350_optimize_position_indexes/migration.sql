-- CreateIndex
CREATE INDEX "idx_position_device_time" ON "Position"("deviceId", "recordedAt");

-- CreateIndex
CREATE INDEX "idx_position_driver_time_coords" ON "Position"("driverId", "recordedAt", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_position_manager_time_coords" ON "Position"("managerId", "recordedAt", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_position_driver_time_desc" ON "Position"("driverId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_position_manager_time_desc" ON "Position"("managerId", "recordedAt" DESC);

-- RenameIndex
ALTER INDEX "Position_deviceId_idx" RENAME TO "idx_position_device";

-- RenameIndex
ALTER INDEX "Position_driverId_idx" RENAME TO "idx_position_driver";

-- RenameIndex
ALTER INDEX "Position_driverId_recordedAt_idx" RENAME TO "idx_position_driver_time";

-- RenameIndex
ALTER INDEX "Position_managerId_idx" RENAME TO "idx_position_manager";

-- RenameIndex
ALTER INDEX "Position_managerId_recordedAt_idx" RENAME TO "idx_position_manager_time";

-- RenameIndex
ALTER INDEX "Position_recordedAt_idx" RENAME TO "idx_position_recorded";
