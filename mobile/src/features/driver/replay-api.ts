import { apiFetch } from "@/lib/api";
import type { DriverReplayResponse } from "@/types/replay";

export function fetchDriverReplay(params: {
  driverId: string;
  startDate: string;
  endDate: string;
  limit?: number;
}) {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    limit: String(params.limit || 1000),
  });

  return apiFetch<DriverReplayResponse>(
    `/api/drivers/${params.driverId}/positions?${search.toString()}`
  );
}
