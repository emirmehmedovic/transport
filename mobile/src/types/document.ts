export type DriverDocumentType =
  | "BOL"
  | "POD"
  | "DAMAGE_REPORT"
  | "LOAD_PHOTO"
  | "RATE_CONFIRMATION"
  | "FUEL_RECEIPT"
  | "INSPECTION_PHOTO"
  | "INCIDENT_PHOTO"
  | "CDL_LICENSE"
  | "MEDICAL_CARD"
  | "INSURANCE"
  | "REGISTRATION"
  | "OTHER";

export type DriverDocumentListItem = {
  id: string;
  type: DriverDocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  expiryDate: string | null;
  createdAt: string;
  load: {
    id: string;
    loadNumber: string;
  } | null;
  driver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
};

export type DriverDocumentsResponse = {
  documents: DriverDocumentListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type DriverDocumentUploadResponse = {
  message: string;
  document: DriverDocumentListItem;
};
