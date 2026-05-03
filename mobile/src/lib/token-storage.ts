import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "transport_mobile_access_token";
const REFRESH_TOKEN_KEY = "transport_mobile_refresh_token";
const PUSH_TOKEN_KEY = "transport_mobile_push_token";

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTokens(params: {
  accessToken: string;
  refreshToken: string;
}) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, params.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, params.refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function getPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function savePushToken(pushToken: string) {
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, pushToken);
}

export async function clearPushToken() {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
