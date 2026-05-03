import * as SecureStore from "expo-secure-store";

const DRIVER_CONFIRMATION_QUEUE_KEY = "transport_driver_confirmation_queue";

export type QueuedDriverConfirmation = {
  userId: string;
  notificationId: string;
  queuedAt: string;
};

async function readQueue(): Promise<QueuedDriverConfirmation[]> {
  const raw = await SecureStore.getItemAsync(DRIVER_CONFIRMATION_QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedDriverConfirmation =>
        item &&
        typeof item.userId === "string" &&
        typeof item.notificationId === "string" &&
        typeof item.queuedAt === "string"
    );
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedDriverConfirmation[]) {
  await SecureStore.setItemAsync(
    DRIVER_CONFIRMATION_QUEUE_KEY,
    JSON.stringify(items)
  );
}

export async function getQueuedDriverConfirmations(userId: string) {
  const items = await readQueue();
  return items.filter((item) => item.userId === userId);
}

export async function queueDriverConfirmation(
  userId: string,
  notificationId: string
) {
  const items = await readQueue();
  const exists = items.some(
    (item) => item.userId === userId && item.notificationId === notificationId
  );

  if (exists) return;

  items.push({
    userId,
    notificationId,
    queuedAt: new Date().toISOString(),
  });

  await writeQueue(items);
}

export async function clearQueuedDriverConfirmation(
  userId: string,
  notificationId: string
) {
  const items = await readQueue();
  await writeQueue(
    items.filter(
      (item) =>
        !(item.userId === userId && item.notificationId === notificationId)
    )
  );
}
