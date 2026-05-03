import { Platform } from "react-native";

declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;

function getDefaultApiBaseUrl() {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://localhost:3000";
}

export const API_BASE_URL =
  process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || getDefaultApiBaseUrl();

export const MOBILE_REQUEST_TIMEOUT_MS = 15000;

export const EXPO_EAS_PROJECT_ID =
  process?.env?.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || "";
