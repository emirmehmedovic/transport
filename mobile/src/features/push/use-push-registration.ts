import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { EXPO_EAS_PROJECT_ID } from "@/config/env";
import { useAuthStore } from "@/features/auth/auth-store";
import { registerPushDevice } from "@/features/push/push-api";
import { getPushToken, savePushToken } from "@/lib/token-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getPlatform(): "ANDROID" | "IOS" | "UNKNOWN" {
  if (Platform.OS === "android") return "ANDROID";
  if (Platform.OS === "ios") return "IOS";
  return "UNKNOWN";
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0f172a",
  });
}

async function getExpoPushToken() {
  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  await ensureAndroidChannel();

  const tokenResult = EXPO_EAS_PROJECT_ID
    ? await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_EAS_PROJECT_ID,
      })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResult.data;
}

export function usePushRegistration() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let cancelled = false;

    async function register() {
      try {
        const token = await getExpoPushToken();
        if (!token || cancelled) return;

        const currentSavedToken = await getPushToken();
        if (currentSavedToken === token) {
          return;
        }

        await registerPushDevice({
          pushToken: token,
          platform: getPlatform(),
          deviceName: Platform.OS,
          appVersion: "1.0.0",
        });

        await savePushToken(token);
      } catch (error) {
        console.warn("Push registration skipped:", error);
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);
}
