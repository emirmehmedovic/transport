import { apiFetch } from "@/lib/api";
import type {
  ClientLiveMapResponse,
  ClientLoadDetailResponse,
  ClientLoadsResponse,
  ClientNotificationsResponse,
  ClientProfileResponse,
} from "@/types/client";

export function fetchClientLoads() {
  return apiFetch<ClientLoadsResponse>("/api/client/loads");
}

export function fetchClientLoadDetail(loadId: string) {
  return apiFetch<ClientLoadDetailResponse>(`/api/loads/${loadId}`);
}

export function fetchClientProfile() {
  return apiFetch<ClientProfileResponse>("/api/client/profile");
}

export function fetchClientNotifications() {
  return apiFetch<ClientNotificationsResponse>("/api/client/notifications");
}

export function markClientNotificationRead(id: string) {
  return apiFetch<{ success: true }>("/api/client/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id }),
  });
}

export function markAllClientNotificationsRead() {
  return apiFetch<{ success: true }>("/api/client/notifications", {
    method: "PATCH",
    body: JSON.stringify({ markAll: true }),
  });
}

export function fetchClientLiveMap() {
  return apiFetch<ClientLiveMapResponse>("/api/client/live-map");
}
