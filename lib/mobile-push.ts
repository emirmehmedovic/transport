import { prisma } from "@/lib/prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type MobilePushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function isExpoPushToken(pushToken: string) {
  return /^ExponentPushToken\[[A-Za-z0-9\-_]+\]$/.test(pushToken);
}

export async function sendPushToUser(
  userId: string,
  payload: MobilePushPayload
): Promise<{ sent: number; failed: number }> {
  const devices = await prisma.mobilePushDevice.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      pushToken: true,
    },
  });

  if (devices.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const validDevices = devices.filter((device) => isExpoPushToken(device.pushToken));

  if (validDevices.length === 0) {
    return { sent: 0, failed: devices.length };
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      validDevices.map((device) => ({
        to: device.pushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: "default",
        priority: "high",
        channelId: "default",
      }))
    ),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }

  const result = (await response.json()) as {
    data?: Array<{
      status: "ok" | "error";
      details?: { error?: string };
      message?: string;
    }>;
  };

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < validDevices.length; i++) {
    const ticket = result.data?.[i];
    if (ticket?.status === "ok") {
      sent += 1;
      continue;
    }

    failed += 1;
    if (ticket?.details?.error === "DeviceNotRegistered") {
      invalidTokens.push(validDevices[i].pushToken);
    }
  }

  if (invalidTokens.length > 0) {
    await prisma.mobilePushDevice.updateMany({
      where: {
        pushToken: { in: invalidTokens },
      },
      data: {
        isActive: false,
      },
    });
  }

  return { sent, failed };
}
