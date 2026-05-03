import { apiFetch } from "@/lib/api";
import type {
  CreateDriverInspectionPayload,
  DriverInspectionDetailResponse,
  DriverInspectionsResponse,
} from "@/types/inspection";

export function fetchDriverInspections() {
  return apiFetch<DriverInspectionsResponse>("/api/inspections");
}

export function fetchDriverInspectionDetail(inspectionId: string) {
  return apiFetch<DriverInspectionDetailResponse>(`/api/inspections/${inspectionId}`);
}

export function createDriverInspection(payload: CreateDriverInspectionPayload) {
  return apiFetch<DriverInspectionDetailResponse>("/api/inspections", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
