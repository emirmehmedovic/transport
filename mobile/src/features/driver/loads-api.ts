import { apiFetch } from "@/lib/api";
import type { DriverLoadDetailResponse, DriverLoadsResponse } from "@/types/load";

export function fetchDriverLoads() {
  return apiFetch<DriverLoadsResponse>("/api/loads?page=1&pageSize=20");
}

export function fetchDriverLoadDetail(loadId: string) {
  return apiFetch<DriverLoadDetailResponse>(`/api/loads/${loadId}`);
}
