import { apiFetch } from "@/lib/api";

type RegisterPushDeviceParams = {
  pushToken: string;
  platform: "ANDROID" | "IOS" | "UNKNOWN";
  deviceName?: string | null;
  appVersion?: string | null;
};

export function registerPushDevice(params: RegisterPushDeviceParams) {
  return apiFetch<{ success: true }>("/api/mobile/push/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function unregisterPushDevice(pushToken: string) {
  return apiFetch<{ success: true }>("/api/mobile/push/register", {
    method: "DELETE",
    body: JSON.stringify({ pushToken }),
  });
}
