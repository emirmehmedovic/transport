-- Driver compliance expiry queries
CREATE INDEX "Driver_cdlExpiry_idx" ON "Driver"("cdlExpiry");
CREATE INDEX "Driver_medicalCardExpiry_idx" ON "Driver"("medicalCardExpiry");

-- Truck and trailer expiry alerts
CREATE INDEX "Truck_isActive_registrationExpiry_idx" ON "Truck"("isActive", "registrationExpiry");
CREATE INDEX "Truck_isActive_insuranceExpiry_idx" ON "Truck"("isActive", "insuranceExpiry");
CREATE INDEX "Trailer_isActive_registrationExpiry_idx" ON "Trailer"("isActive", "registrationExpiry");
CREATE INDEX "Trailer_isActive_insuranceExpiry_idx" ON "Trailer"("isActive", "insuranceExpiry");

-- Toll permit expiry filters
CREATE INDEX "TollPermit_status_validTo_idx" ON "TollPermit"("status", "validTo");

-- Load access patterns for alerts, dashboard and route plans
CREATE INDEX "Load_status_actualDeliveryDate_idx" ON "Load"("status", "actualDeliveryDate");
CREATE INDEX "Load_driverId_actualDeliveryDate_idx" ON "Load"("driverId", "actualDeliveryDate");
CREATE INDEX "Load_truckId_actualDeliveryDate_idx" ON "Load"("truckId", "actualDeliveryDate");
CREATE INDEX "Load_driverId_status_scheduledPickupDate_idx" ON "Load"("driverId", "status", "scheduledPickupDate");
CREATE INDEX "Load_generatedFromRoutePlanId_scheduledPickupDate_idx" ON "Load"("generatedFromRoutePlanId", "scheduledPickupDate");

-- Document listing and association filters
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");
CREATE INDEX "Document_loadId_type_idx" ON "Document"("loadId", "type");
CREATE INDEX "Document_driverId_createdAt_idx" ON "Document"("driverId", "createdAt");
CREATE INDEX "Document_inspectionId_createdAt_idx" ON "Document"("inspectionId", "createdAt");
CREATE INDEX "Document_incidentId_createdAt_idx" ON "Document"("incidentId", "createdAt");

-- Pay stub aging filters
CREATE INDEX "PayStub_isPaid_createdAt_idx" ON "PayStub"("isPaid", "createdAt");
CREATE INDEX "PayStub_isPaid_periodEnd_idx" ON "PayStub"("isPaid", "periodEnd");

-- Maintenance due scans
CREATE INDEX "MaintenanceRecord_nextServiceDue_idx" ON "MaintenanceRecord"("nextServiceDue");
CREATE INDEX "MaintenanceRecord_truckId_nextServiceDue_idx" ON "MaintenanceRecord"("truckId", "nextServiceDue");

-- Pending app confirmation scans
CREATE INDEX "AppNotification_requiresConfirmation_confirmedAt_type_createdAt_idx"
ON "AppNotification"("requiresConfirmation", "confirmedAt", "type", "createdAt");
