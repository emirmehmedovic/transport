import { apiFetch } from "@/lib/api";
import type { DriverDashboardResponse } from "@/types/dashboard";

export function fetchDriverDashboard() {
  return apiFetch<DriverDashboardResponse>("/api/mobile/driver/dashboard");
}
