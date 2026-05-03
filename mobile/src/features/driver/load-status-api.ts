import { apiFetch } from "@/lib/api";
import type { DriverLoadDetailResponse } from "@/types/load";

export type DriverLoadStatusAction = "pickup" | "start_transit" | "deliver";

export function updateDriverLoadStatus(loadId: string, action: DriverLoadStatusAction) {
  return apiFetch<{
    success: boolean;
    message: string;
    load: DriverLoadDetailResponse["load"];
  }>(`/api/loads/${loadId}/update-status`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
