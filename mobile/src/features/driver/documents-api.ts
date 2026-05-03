import { API_BASE_URL } from "@/config/env";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/token-storage";
import type {
  DriverDocumentListItem,
  DriverDocumentsResponse,
  DriverDocumentType,
  DriverDocumentUploadResponse,
} from "@/types/document";

type UploadDriverDocumentParams = {
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
  type: DriverDocumentType;
  driverId?: string | null;
  loadId?: string | null;
  inspectionId?: string | null;
  expiryDate?: string | null;
};

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  BOL: "Tovarni list",
  POD: "Potvrda dostave",
  DAMAGE_REPORT: "Zapisnik o šteti",
  LOAD_PHOTO: "Fotografija loada",
  RATE_CONFIRMATION: "Potvrda cijene",
  FUEL_RECEIPT: "Račun za gorivo",
  INSPECTION_PHOTO: "Fotografija inspekcije",
  INCIDENT_PHOTO: "Fotografija incidenta",
  CDL_LICENSE: "Vozačka dozvola",
  MEDICAL_CARD: "Ljekarsko uvjerenje",
  INSURANCE: "Osiguranje",
  REGISTRATION: "Registracija",
  OTHER: "Ostalo",
};

export function fetchDriverDocuments(driverId?: string | null) {
  const query = driverId ? `?driverId=${encodeURIComponent(driverId)}&page=1&limit=20` : "?page=1&limit=20";
  return apiFetch<DriverDocumentsResponse>(`/api/documents${query}`);
}

export function fetchInspectionDocuments(inspectionId: string) {
  return apiFetch<DriverDocumentsResponse>(
    `/api/documents?inspectionId=${encodeURIComponent(inspectionId)}&page=1&limit=20`
  );
}

async function uploadDriverDocument(
  params: UploadDriverDocumentParams
): Promise<DriverDocumentUploadResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Sesija je istekla. Prijavite se ponovo.");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: params.fileUri,
    name: params.fileName,
    type: params.mimeType || "application/octet-stream",
  } as any);
  formData.append("type", params.type);

  if (params.driverId) {
    formData.append("driverId", params.driverId);
  }

  if (params.loadId) {
    formData.append("loadId", params.loadId);
  }

  if (params.inspectionId) {
    formData.append("inspectionId", params.inspectionId);
  }

  if (params.expiryDate) {
    formData.append("expiryDate", params.expiryDate);
  }

  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Upload dokumenta nije uspio.");
  }

  return (await response.json()) as DriverDocumentUploadResponse;
}

export function uploadDriverGeneralDocument(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
  driverId: string;
  type?: Extract<DriverDocumentType, "OTHER" | "CDL_LICENSE" | "MEDICAL_CARD" | "INSURANCE" | "REGISTRATION">;
  expiryDate?: string | null;
}) {
  return uploadDriverDocument({
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    driverId: params.driverId,
    type: params.type || "OTHER",
    expiryDate: params.expiryDate,
  });
}

export function uploadDriverProofOfDelivery(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
  loadId: string;
}) {
  return uploadDriverDocument({
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    loadId: params.loadId,
    type: "POD",
  });
}

export function uploadInspectionPhoto(params: {
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
  inspectionId: string;
}) {
  return uploadDriverDocument({
    fileUri: params.fileUri,
    fileName: params.fileName,
    mimeType: params.mimeType,
    type: "INSPECTION_PHOTO",
    inspectionId: params.inspectionId,
  });
}

export function sortDocumentsByNewest(documents: DriverDocumentListItem[]) {
  return [...documents].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}
