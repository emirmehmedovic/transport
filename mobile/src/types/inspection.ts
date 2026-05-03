export type DriverInspectionType = "PRE_TRIP" | "POST_TRIP";
export type DriverInspectionStatus = "SAFE" | "UNSAFE" | "NEEDS_REPAIR";

export type DriverInspectionListItem = {
  id: string;
  type: DriverInspectionType;
  status: DriverInspectionStatus;
  checklist: Record<string, boolean> | null;
  odometer: number | null;
  defects: boolean;
  defectNotes: string | null;
  notes: string | null;
  createdAt: string;
  driver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  truck: {
    id: string;
    truckNumber: string;
  };
  trailer: {
    id: string;
    trailerNumber: string;
  } | null;
};

export type DriverInspectionsResponse = {
  inspections: DriverInspectionListItem[];
};

export type DriverInspectionDetailResponse = {
  inspection: DriverInspectionListItem;
};

export type CreateDriverInspectionPayload = {
  type: DriverInspectionType;
  status: DriverInspectionStatus;
  truckId: string;
  odometer?: string;
  defects?: boolean;
  defectNotes?: string;
  notes?: string;
  checklist?: Record<string, boolean>;
};
