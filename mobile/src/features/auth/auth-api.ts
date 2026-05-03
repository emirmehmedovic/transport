import { apiFetch } from "@/lib/api";
import {
  clearPushToken,
  clearTokens,
  getPushToken,
  saveTokens,
} from "@/lib/token-storage";
import { unregisterPushDevice } from "@/features/push/push-api";
import type { LoginResponse, MeResponse } from "@/types/auth";

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  });

  await saveTokens({
    accessToken: data.token,
    refreshToken: data.refreshToken,
  });

  return data;
}

export async function fetchMe() {
  return apiFetch<MeResponse>("/api/auth/me");
}

export async function logout() {
  try {
    const pushToken = await getPushToken();
    if (pushToken) {
      await unregisterPushDevice(pushToken).catch(() => undefined);
      await clearPushToken();
    }

    await apiFetch("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    await clearTokens();
  }
}
