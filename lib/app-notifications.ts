import { AppNotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/mobile-push";

type CreateNotificationInput = {
  userId: string;
  driverId?: string | null;
  type: AppNotificationType;
  notificationKey: string;
  title: string;
  message: string;
  requiresConfirmation?: boolean;
  data?: Prisma.InputJsonObject;
};

export async function createAndSendAppNotification(input: CreateNotificationInput) {
  const existing = await prisma.appNotification.findUnique({
    where: {
      notificationKey: input.notificationKey,
    },
    select: { id: true },
  });

  if (existing) {
    return { created: false, sent: false };
  }

  const notification = await prisma.appNotification.create({
    data: {
      userId: input.userId,
      driverId: input.driverId ?? null,
      type: input.type,
      notificationKey: input.notificationKey,
      title: input.title,
      message: input.message,
      requiresConfirmation: input.requiresConfirmation ?? false,
      data: input.data,
    },
  });

  try {
    const pushResult = await sendPushToUser(input.userId, {
      title: input.title,
      body: input.message,
      data: {
        notificationId: notification.id,
        type: input.type,
        ...(input.data ?? {}),
      },
    });

    await prisma.appNotification.update({
      where: { id: notification.id },
      data: {
        pushSentAt: new Date(),
        pushStatus: pushResult.sent > 0 ? `sent:${pushResult.sent}` : `failed:${pushResult.failed}`,
      },
    });

    return { created: true, sent: pushResult.sent > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push slanje nije uspjelo";

    await prisma.appNotification.update({
      where: { id: notification.id },
      data: {
        pushStatus: `error:${message}`,
      },
    });

    throw error;
  }
}
