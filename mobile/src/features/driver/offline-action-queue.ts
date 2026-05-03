import * as SecureStore from "expo-secure-store";
import { createDriverInspection } from "@/features/driver/inspections-api";
import { updateDriverLoadOps } from "@/features/driver/load-ops-api";
import { updateDriverLoadStatus, type DriverLoadStatusAction } from "@/features/driver/load-status-api";
import {
  uploadDriverGeneralDocument,
  uploadDriverProofOfDelivery,
  uploadInspectionPhoto,
} from "@/features/driver/documents-api";
import type { DriverDocumentType } from "@/types/document";
import type {
  DriverInspectionStatus,
  DriverInspectionType,
} from "@/types/inspection";

const DRIVER_OFFLINE_ACTION_QUEUE_KEY = "transport_driver_offline_action_queue";

type BaseQueuedAction = {
  id: string;
  userId: string;
  queuedAt: string;
};

export type QueuedDriverOfflineAction =
  | (BaseQueuedAction & {
      type: "LOAD_STATUS";
      payload: {
        loadId: string;
        action: DriverLoadStatusAction;
      };
    })
  | (BaseQueuedAction & {
      type: "LOAD_OPS";
      payload: {
        loadId: string;
        checklist?: Record<string, boolean>;
        delayReason?: string | null;
        pickupExceptionReason?: string | null;
        deliveryExceptionReason?: string | null;
      };
    })
  | (BaseQueuedAction & {
      type: "CREATE_INSPECTION";
      payload: {
        type: DriverInspectionType;
        status: DriverInspectionStatus;
        truckId: string;
        odometer?: string;
        defects?: boolean;
        defectNotes?: string;
        notes?: string;
        checklist?: Record<string, boolean>;
      };
    })
  | (BaseQueuedAction & {
      type: "UPLOAD_DRIVER_DOCUMENT";
      payload: {
        fileUri: string;
        fileName: string;
        mimeType?: string | null;
        driverId: string;
        documentType: Extract<
          DriverDocumentType,
          "OTHER" | "CDL_LICENSE" | "MEDICAL_CARD" | "INSURANCE" | "REGISTRATION"
        >;
        expiryDate?: string | null;
      };
    })
  | (BaseQueuedAction & {
      type: "UPLOAD_POD";
      payload: {
        fileUri: string;
        fileName: string;
        mimeType?: string | null;
        loadId: string;
      };
    })
  | (BaseQueuedAction & {
      type: "UPLOAD_INSPECTION_PHOTO";
      payload: {
        fileUri: string;
        fileName: string;
        mimeType?: string | null;
        inspectionId: string;
      };
    });

function createQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

async function readQueue(): Promise<QueuedDriverOfflineAction[]> {
  const raw = await SecureStore.getItemAsync(DRIVER_OFFLINE_ACTION_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedDriverOfflineAction =>
        item &&
        typeof item.id === "string" &&
        typeof item.userId === "string" &&
        typeof item.queuedAt === "string" &&
        typeof item.type === "string" &&
        item.payload
    );
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedDriverOfflineAction[]) {
  await SecureStore.setItemAsync(
    DRIVER_OFFLINE_ACTION_QUEUE_KEY,
    JSON.stringify(items)
  );
}

export async function getQueuedDriverOfflineActions(userId: string) {
  const items = await readQueue();
  return items.filter((item) => item.userId === userId);
}

export async function queueDriverOfflineAction(
  action: Omit<QueuedDriverOfflineAction, "id" | "queuedAt">
) {
  const items = await readQueue();
  items.push({
    ...action,
    id: createQueueId(),
    queuedAt: new Date().toISOString(),
  } as QueuedDriverOfflineAction);
  await writeQueue(items);
}

export async function clearQueuedDriverOfflineAction(actionId: string) {
  const items = await readQueue();
  await writeQueue(items.filter((item) => item.id !== actionId));
}

async function processQueuedAction(item: QueuedDriverOfflineAction) {
  switch (item.type) {
    case "LOAD_STATUS":
      await updateDriverLoadStatus(item.payload.loadId, item.payload.action);
      return;
    case "LOAD_OPS":
      await updateDriverLoadOps(item.payload.loadId, {
        checklist: item.payload.checklist,
        delayReason: item.payload.delayReason,
        pickupExceptionReason: item.payload.pickupExceptionReason,
        deliveryExceptionReason: item.payload.deliveryExceptionReason,
      });
      return;
    case "CREATE_INSPECTION":
      await createDriverInspection(item.payload);
      return;
    case "UPLOAD_DRIVER_DOCUMENT":
      await uploadDriverGeneralDocument({
        fileUri: item.payload.fileUri,
        fileName: item.payload.fileName,
        mimeType: item.payload.mimeType,
        driverId: item.payload.driverId,
        type: item.payload.documentType,
        expiryDate: item.payload.expiryDate,
      });
      return;
    case "UPLOAD_POD":
      await uploadDriverProofOfDelivery({
        fileUri: item.payload.fileUri,
        fileName: item.payload.fileName,
        mimeType: item.payload.mimeType,
        loadId: item.payload.loadId,
      });
      return;
    case "UPLOAD_INSPECTION_PHOTO":
      await uploadInspectionPhoto({
        fileUri: item.payload.fileUri,
        fileName: item.payload.fileName,
        mimeType: item.payload.mimeType,
        inspectionId: item.payload.inspectionId,
      });
      return;
  }
}

export async function flushQueuedDriverOfflineActions(userId: string) {
  const queued = await getQueuedDriverOfflineActions(userId);

  for (const item of queued) {
    try {
      await processQueuedAction(item);
      await clearQueuedDriverOfflineAction(item.id);
    } catch (error) {
      if (isOfflineLikeError(error)) {
        break;
      }
    }
  }
}
