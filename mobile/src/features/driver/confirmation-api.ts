import { apiFetch } from "@/lib/api";
import {
  clearQueuedDriverConfirmation,
  getQueuedDriverConfirmations,
} from "@/features/driver/confirmation-queue";
import type {
  DriverInboxNotificationsResponse,
  PendingDriverConfirmationsResponse,
} from "@/types/app-notification";

export function fetchPendingDriverConfirmations() {
  return apiFetch<PendingDriverConfirmationsResponse>(
    "/api/mobile/app-notifications/pending"
  );
}

export function confirmDriverNotification(notificationId: string, offlineQueuedAt?: string | null) {
  return apiFetch<{ success: true; alreadyConfirmed?: boolean }>(
    `/api/mobile/app-notifications/${notificationId}/confirm`,
    {
      method: "POST",
      body: offlineQueuedAt
        ? JSON.stringify({
            offlineQueuedAt,
          })
        : undefined,
      headers: offlineQueuedAt
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    }
  );
}

export function fetchDriverInboxNotifications() {
  return apiFetch<DriverInboxNotificationsResponse>("/api/mobile/app-notifications");
}

export function markDriverNotificationRead(notificationId: string) {
  return apiFetch<{ success: true; alreadyRead?: boolean }>(
    `/api/mobile/app-notifications/${notificationId}/read`,
    {
      method: "POST",
    }
  );
}

export function markAllDriverNotificationsRead() {
  return apiFetch<{ success: true }>("/api/mobile/app-notifications/read-all", {
    method: "POST",
  });
}

function isOfflineLikeError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("abort") ||
    message.includes("timed out")
  );
}

function isSafeToDropQueuedConfirmation(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("nije pronađen") ||
    message.includes("not found") ||
    message.includes("alreadyconfirmed")
  );
}

export async function flushQueuedDriverConfirmations(userId: string) {
  const queued = await getQueuedDriverConfirmations(userId);

  for (const item of queued) {
    try {
      await confirmDriverNotification(item.notificationId, item.queuedAt);
      await clearQueuedDriverConfirmation(userId, item.notificationId);
    } catch (error) {
      if (isSafeToDropQueuedConfirmation(error)) {
        await clearQueuedDriverConfirmation(userId, item.notificationId);
        continue;
      }

      if (isOfflineLikeError(error)) {
        break;
      }
    }
  }
}
