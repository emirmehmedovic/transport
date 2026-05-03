import { apiFetch } from "@/lib/api";
import type { DriverSchengenResponse } from "@/types/schengen";

export function fetchDriverSchengen(driverId: string) {
  return apiFetch<DriverSchengenResponse>(`/api/drivers/${driverId}/schengen`);
}
