import { prisma } from "@/lib/prisma";
import type { ClientNotificationType } from "@prisma/client";

type ClientNotifType = ClientNotificationType;

async function createClientLoadNotification(
  loadId: string,
  type: ClientNotifType
): Promise<void> {
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    select: {
      id: true,
      loadNumber: true,
      sourceType: true,
      requestedByUserId: true,
      pickupCity: true,
      deliveryCity: true,
    },
  });

  if (!load || load.sourceType !== "CLIENT_PORTAL" || !load.requestedByUserId) {
    return;
  }

  const messageByType: Record<ClientNotifType, { title: string; message: string }> = {
    LOAD_APPROVED: {
      title: `Load #${load.loadNumber} je odobren`,
      message: `Vaš transport ${load.pickupCity} → ${load.deliveryCity} je odobren i čeka operativnu realizaciju.`,
    },
    LOAD_PICKED_UP: {
      title: `Load #${load.loadNumber} je pokupljen`,
      message: `Vaš transport ${load.pickupCity} → ${load.deliveryCity} je označen kao pokupljen i u operativnoj je obradi.`,
    },
    LOAD_COMPLETED: {
      title: `Load #${load.loadNumber} je završen`,
      message: `Vaš transport ${load.pickupCity} → ${load.deliveryCity} je završen.`,
    },
  };

  const content = messageByType[type];

  await prisma.clientNotification.upsert({
    where: {
      userId_loadId_type: {
        userId: load.requestedByUserId,
        loadId: load.id,
        type,
      },
    },
    update: {
      title: content.title,
      message: content.message,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    },
    create: {
      userId: load.requestedByUserId,
      loadId: load.id,
      type,
      title: content.title,
      message: content.message,
    },
  });
}

export async function createLoadApprovedNotification(loadId: string): Promise<void> {
  await createClientLoadNotification(loadId, "LOAD_APPROVED");
}

export async function createLoadPickedUpNotification(loadId: string): Promise<void> {
  await createClientLoadNotification(loadId, "LOAD_PICKED_UP");
}

export async function createLoadCompletedNotification(loadId: string): Promise<void> {
  await createClientLoadNotification(loadId, "LOAD_COMPLETED");
}
