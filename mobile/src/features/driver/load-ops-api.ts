import { apiFetch } from "@/lib/api";

export function updateDriverLoadOps(
  loadId: string,
  payload: {
    checklist?: Record<string, boolean>;
    delayReason?: string | null;
    pickupExceptionReason?: string | null;
    deliveryExceptionReason?: string | null;
  }
) {
  return apiFetch<{
    load: {
      id: string;
      checklist: Record<string, boolean> | null;
      delayReason: string | null;
      pickupExceptionReason: string | null;
      deliveryExceptionReason: string | null;
    };
  }>(`/api/loads/${loadId}/driver-ops`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
