import { API_BASE_URL, MOBILE_REQUEST_TIMEOUT_MS } from "@/config/env";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/lib/token-storage";
import type { RefreshResponse } from "@/types/auth";

type ApiRequestInit = RequestInit & {
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
};

async function refreshSession(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "x-refresh-token": refreshToken,
    },
  });

  if (!response.ok) {
    await clearTokens();
    return null;
  }

  const data = (await response.json()) as RefreshResponse;
  await saveTokens({
    accessToken: data.token,
    refreshToken: data.refreshToken,
  });

  return data.token;
}

export async function apiFetch<T>(
  path: string,
  init: ApiRequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MOBILE_REQUEST_TIMEOUT_MS);

  try {
    const accessToken = init.skipAuth ? null : await getAccessToken();
    const headers = new Headers(init.headers || {});

    if (!init.skipAuth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (response.status === 401 && !init.skipAuth && !init.skipRefreshRetry) {
      const refreshedAccessToken = await refreshSession();

      if (refreshedAccessToken) {
        return apiFetch<T>(path, {
          ...init,
          skipRefreshRetry: true,
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
