import { apiFetch } from "@/lib/api";
import type { MobileRoutePlansResponse } from "@/types/route-plan";

export function fetchDriverRoutePlans() {
  return apiFetch<MobileRoutePlansResponse>("/api/mobile/driver/route-plans");
}
