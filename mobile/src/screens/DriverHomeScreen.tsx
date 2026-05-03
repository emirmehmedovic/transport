import React from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ReplayMapView } from "@/components/ReplayMapView";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  confirmDriverNotification,
  fetchDriverInboxNotifications,
  fetchPendingDriverConfirmations,
  flushQueuedDriverConfirmations,
  markAllDriverNotificationsRead,
  markDriverNotificationRead,
} from "@/features/driver/confirmation-api";
import {
  getQueuedDriverConfirmations,
  queueDriverConfirmation,
} from "@/features/driver/confirmation-queue";
import {
  flushQueuedDriverOfflineActions,
  getQueuedDriverOfflineActions,
  queueDriverOfflineAction,
} from "@/features/driver/offline-action-queue";
import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  fetchDriverDocuments,
  fetchInspectionDocuments,
  sortDocumentsByNewest,
  uploadDriverGeneralDocument,
  uploadInspectionPhoto,
  uploadDriverProofOfDelivery,
} from "@/features/driver/documents-api";
import { fetchDriverDashboard } from "@/features/driver/dashboard-api";
import {
  createDriverInspection,
  fetchDriverInspectionDetail,
  fetchDriverInspections,
} from "@/features/driver/inspections-api";
import { updateDriverLoadOps } from "@/features/driver/load-ops-api";
import { updateDriverLoadStatus } from "@/features/driver/load-status-api";
import { fetchDriverLoadDetail, fetchDriverLoads } from "@/features/driver/loads-api";
import { fetchDriverReplay } from "@/features/driver/replay-api";
import { fetchDriverSchengen } from "@/features/driver/schengen-api";
import type {
  DriverInboxNotificationsResponse,
  PendingDriverConfirmation,
} from "@/types/app-notification";
import type { DriverDashboardResponse } from "@/types/dashboard";
import type { DriverDocumentType, DriverDocumentsResponse } from "@/types/document";
import type {
  DriverInspectionDetailResponse,
  DriverInspectionStatus,
  DriverInspectionsResponse,
  DriverInspectionType,
} from "@/types/inspection";
import type { DriverLoadDetailResponse, DriverLoadsResponse } from "@/types/load";
import type { DriverReplayResponse } from "@/types/replay";
import type { DriverSchengenResponse } from "@/types/schengen";

type DriverSection =
  | "overview"
  | "schengen"
  | "replay"
  | "loads"
  | "documents"
  | "inspections"
  | "inbox";

type DriverHomeScreenProps = {
  lockedSection?: DriverSection;
  showSectionTabs?: boolean;
};

function formatOptionalDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Nije evidentirano";
}

function formatConfirmationTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Nije evidentirano";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

const INSPECTION_TYPE_LABELS: Record<DriverInspectionType, string> = {
  PRE_TRIP: "Prije vožnje",
  POST_TRIP: "Poslije vožnje",
};

const INSPECTION_STATUS_LABELS: Record<DriverInspectionStatus, string> = {
  SAFE: "Sigurno",
  UNSAFE: "Nesigurno",
  NEEDS_REPAIR: "Potrebna popravka",
};

export function DriverHomeScreen({
  lockedSection,
  showSectionTabs = true,
}: DriverHomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const [section, setSection] = React.useState<DriverSection>("overview");
  const [dashboard, setDashboard] = React.useState<DriverDashboardResponse | null>(null);
  const [schengen, setSchengen] = React.useState<DriverSchengenResponse | null>(null);
  const [replay, setReplay] = React.useState<DriverReplayResponse | null>(null);
  const [replayLabel, setReplayLabel] = React.useState("Replay zadnjih 24h");
  const [replayFocusPoint, setReplayFocusPoint] = React.useState<{
    latitude: number;
    longitude: number;
    label: string;
  } | null>(null);
  const [loads, setLoads] = React.useState<DriverLoadsResponse | null>(null);
  const [documents, setDocuments] = React.useState<DriverDocumentsResponse | null>(null);
  const [inspections, setInspections] = React.useState<DriverInspectionsResponse | null>(null);
  const [inbox, setInbox] = React.useState<DriverInboxNotificationsResponse | null>(null);
  const [selectedLoadId, setSelectedLoadId] = React.useState<string | null>(null);
  const [selectedLoadDetail, setSelectedLoadDetail] =
    React.useState<DriverLoadDetailResponse | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [selectedInspectionDetail, setSelectedInspectionDetail] =
    React.useState<DriverInspectionDetailResponse | null>(null);
  const [selectedInspectionDocuments, setSelectedInspectionDocuments] =
    React.useState<DriverDocumentsResponse | null>(null);
  const [pendingConfirmations, setPendingConfirmations] =
    React.useState<PendingDriverConfirmation[]>([]);
  const [confirmationLoading, setConfirmationLoading] = React.useState(false);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [queuedConfirmationsCount, setQueuedConfirmationsCount] = React.useState(0);
  const [queuedOfflineActionsCount, setQueuedOfflineActionsCount] = React.useState(0);
  const [documentUploadLoading, setDocumentUploadLoading] = React.useState<DriverDocumentType | "POD" | null>(null);
  const [inspectionSaving, setInspectionSaving] = React.useState(false);
  const [inspectionPhotoUploading, setInspectionPhotoUploading] = React.useState(false);
  const [loadStatusUpdating, setLoadStatusUpdating] = React.useState<string | null>(null);
  const [loadOpsSaving, setLoadOpsSaving] = React.useState(false);
  const [inboxActionLoading, setInboxActionLoading] = React.useState<string | "all" | null>(null);
  const [loadDetailLoading, setLoadDetailLoading] = React.useState(false);
  const [inspectionDetailLoading, setInspectionDetailLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [loadChecklist, setLoadChecklist] = React.useState<Record<string, boolean>>({});
  const [delayReasonDraft, setDelayReasonDraft] = React.useState("");
  const [pickupExceptionDraft, setPickupExceptionDraft] = React.useState("");
  const [deliveryExceptionDraft, setDeliveryExceptionDraft] = React.useState("");
  const [inspectionForm, setInspectionForm] = React.useState<{
    type: DriverInspectionType;
    status: DriverInspectionStatus;
    odometer: string;
    defects: boolean;
    defectNotes: string;
    notes: string;
  }>({
    type: "PRE_TRIP",
    status: "SAFE",
    odometer: "",
    defects: false,
    defectNotes: "",
    notes: "",
  });

  const activeSection = lockedSection ?? section;

  const activeConfirmation = pendingConfirmations[0] || null;
  const sortedDocuments = React.useMemo(
    () => sortDocumentsByNewest(documents?.documents || []),
    [documents?.documents]
  );

  const refreshDocuments = React.useCallback(async () => {
    if (!user?.driver?.id) return;

    const data = await fetchDriverDocuments(user.driver.id);
    setDocuments(data);
  }, [user?.driver?.id]);

  const refreshInspections = React.useCallback(async () => {
    const data = await fetchDriverInspections();
    setInspections(data);
  }, []);

  const refreshInbox = React.useCallback(async () => {
    const data = await fetchDriverInboxNotifications();
    setInbox(data);
  }, []);

  const refreshQueuedOfflineActionsCount = React.useCallback(async () => {
    if (!user?.id) return;
    const queued = await getQueuedDriverOfflineActions(user.id);
    setQueuedOfflineActionsCount(queued.length);
  }, [user?.id]);

  const isOfflineLikeError = React.useCallback((error: unknown) => {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    return (
      message.includes("network request failed") ||
      message.includes("failed to fetch") ||
      message.includes("abort") ||
      message.includes("timed out")
    );
  }, []);

  const loadPendingConfirmations = React.useCallback(async () => {
    if (user?.role !== "DRIVER" || !user?.id) return;

    try {
      setConfirmationLoading(true);
      await flushQueuedDriverConfirmations(user.id);
      const data = await fetchPendingDriverConfirmations();
      setPendingConfirmations(data.notifications || []);
    } catch (err) {
      if (!isOfflineLikeError(err)) {
        console.warn("Pending confirmation sync skipped:", err);
      }
    } finally {
      const queued = await getQueuedDriverConfirmations(user.id);
      setQueuedConfirmationsCount(queued.length);
      setConfirmationLoading(false);
    }
  }, [flushQueuedDriverConfirmations, isOfflineLikeError, user?.id, user?.role]);

  const syncQueuedOfflineActions = React.useCallback(async () => {
    if (user?.role !== "DRIVER" || !user?.id) return;

    try {
      const queuedBeforeSync = await getQueuedDriverOfflineActions(user.id);
      await flushQueuedDriverOfflineActions(user.id);
      if (queuedBeforeSync.length > 0) {
        const [dashboardData, loadsData, inspectionsData, inboxData, documentsData] =
          await Promise.all([
            fetchDriverDashboard(),
            fetchDriverLoads(),
            fetchDriverInspections(),
            fetchDriverInboxNotifications(),
            user.driver?.id
              ? fetchDriverDocuments(user.driver.id)
              : Promise.resolve(null),
          ]);

        setDashboard(dashboardData);
        setLoads(loadsData);
        setInspections(inspectionsData);
        setInbox(inboxData);
        if (documentsData) {
          setDocuments(documentsData);
        }
      }
    } catch (err) {
      if (!isOfflineLikeError(err)) {
        console.warn("Offline action sync skipped:", err);
      }
    } finally {
      await refreshQueuedOfflineActionsCount();
    }
  }, [flushQueuedDriverOfflineActions, isOfflineLikeError, refreshQueuedOfflineActionsCount, user?.id, user?.role]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDriverData() {
      try {
        setLoading(true);
        setError(null);
        await syncQueuedOfflineActions();

        const endDate = new Date();
        const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
          dashboardData,
          schengenData,
          replayData,
          loadsData,
          documentsData,
          inspectionsData,
          inboxData,
        ] = await Promise.all([
          fetchDriverDashboard(),
          user?.driver?.id ? fetchDriverSchengen(user.driver.id) : Promise.resolve(null),
          user?.driver?.id
            ? fetchDriverReplay({
                driverId: user.driver.id,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                limit: 1000,
              })
            : Promise.resolve(null),
          fetchDriverLoads(),
          user?.driver?.id ? fetchDriverDocuments(user.driver.id) : Promise.resolve(null),
          fetchDriverInspections(),
          fetchDriverInboxNotifications(),
        ]);

        if (!cancelled) {
          setDashboard(dashboardData);
          setSchengen(schengenData);
          setReplay(replayData);
          setReplayLabel("Replay zadnjih 24h");
          setReplayFocusPoint(null);
          setLoads(loadsData);
          setDocuments(documentsData);
          setInspections(inspectionsData);
          setInbox(inboxData);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Greška pri učitavanju driver podataka.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDriverData();

    return () => {
      cancelled = true;
    };
  }, [syncQueuedOfflineActions, user?.driver?.id]);

  React.useEffect(() => {
    void loadPendingConfirmations();
  }, [loadPendingConfirmations]);

  React.useEffect(() => {
    void refreshQueuedOfflineActionsCount();
  }, [refreshQueuedOfflineActionsCount]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadPendingConfirmations();
        void syncQueuedOfflineActions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadPendingConfirmations, syncQueuedOfflineActions]);

  async function handleConfirmBorderEvent(notificationId: string) {
    if (!user?.id) return;

    try {
      setConfirmingId(notificationId);
      await confirmDriverNotification(notificationId);
      await loadPendingConfirmations();
    } catch (err: any) {
      if (isOfflineLikeError(err)) {
        await queueDriverConfirmation(user.id, notificationId);
        setPendingConfirmations((prev) =>
          prev.filter((notification) => notification.id !== notificationId)
        );
        const queued = await getQueuedDriverConfirmations(user.id);
        setQueuedConfirmationsCount(queued.length);
      } else {
        setError(err?.message || "Greška pri potvrdi događaja.");
      }
    } finally {
      setConfirmingId(null);
    }
  }

  async function loadReplayWindow(params: {
    startDate: Date;
    endDate: Date;
    label: string;
    focusPoint?: {
      latitude: number;
      longitude: number;
      label: string;
    } | null;
  }) {
    if (!user?.driver?.id) return;

    try {
      setLoading(true);
      const replayData = await fetchDriverReplay({
        driverId: user.driver.id,
        startDate: params.startDate.toISOString(),
        endDate: params.endDate.toISOString(),
        limit: 2000,
      });

      setReplay(replayData);
      setReplayLabel(params.label);
      setReplayFocusPoint(params.focusPoint || null);
      setSection("replay");
    } catch (err: any) {
      setError(err?.message || "Greška pri učitavanju replay prozora.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadStatusAction(action: "pickup" | "start_transit" | "deliver") {
    if (!selectedLoadId) return;

    try {
      setLoadStatusUpdating(action);
      setError(null);

      await updateDriverLoadStatus(selectedLoadId, action);

      const [loadsData, detail] = await Promise.all([
        fetchDriverLoads(),
        fetchDriverLoadDetail(selectedLoadId),
      ]);

      setLoads(loadsData);
      setSelectedLoadDetail(detail);
    } catch (err: any) {
      if (user?.id && isOfflineLikeError(err)) {
        await queueDriverOfflineAction({
          userId: user.id,
          type: "LOAD_STATUS",
          payload: {
            loadId: selectedLoadId,
            action,
          },
        });
        await refreshQueuedOfflineActionsCount();
      } else {
        setError(err?.message || "Promjena statusa loada nije uspjela.");
      }
    } finally {
      setLoadStatusUpdating(null);
    }
  }

  async function handleMarkDriverNotificationRead(notificationId: string) {
    try {
      setInboxActionLoading(notificationId);
      await markDriverNotificationRead(notificationId);
      await refreshInbox();
    } catch (err: any) {
      setError(err?.message || "Označavanje notifikacije nije uspjelo.");
    } finally {
      setInboxActionLoading(null);
    }
  }

  async function handleMarkAllDriverNotificationsRead() {
    try {
      setInboxActionLoading("all");
      await markAllDriverNotificationsRead();
      await refreshInbox();
    } catch (err: any) {
      setError(err?.message || "Označavanje svih notifikacija nije uspjelo.");
    } finally {
      setInboxActionLoading(null);
    }
  }

  async function handleSaveLoadOps() {
    if (!selectedLoadId) return;

    try {
      setLoadOpsSaving(true);
      setError(null);

      const payload = {
        checklist: loadChecklist,
        delayReason: delayReasonDraft || null,
        pickupExceptionReason: pickupExceptionDraft || null,
        deliveryExceptionReason: deliveryExceptionDraft || null,
      };

      await updateDriverLoadOps(selectedLoadId, payload);
      const detail = await fetchDriverLoadDetail(selectedLoadId);
      setSelectedLoadDetail(detail);
    } catch (err: any) {
      if (user?.id && isOfflineLikeError(err)) {
        await queueDriverOfflineAction({
          userId: user.id,
          type: "LOAD_OPS",
          payload: {
            loadId: selectedLoadId,
            checklist: loadChecklist,
            delayReason: delayReasonDraft || null,
            pickupExceptionReason: pickupExceptionDraft || null,
            deliveryExceptionReason: deliveryExceptionDraft || null,
          },
        });
        await refreshQueuedOfflineActionsCount();
      } else {
        setError(err?.message || "Spremanje checklist-e nije uspjelo.");
      }
    } finally {
      setLoadOpsSaving(false);
    }
  }

  async function pickAndUploadDocument(options: {
    type: DriverDocumentType;
    mode: "driver" | "pod";
  }) {
    if (!user?.driver?.id) return;
    if (options.mode === "pod" && !dashboard?.activeLoad?.id) {
      setError("Za POD je potreban aktivni load.");
      return;
    }

    let selectedAsset:
      | {
          uri: string;
          name: string;
          mimeType?: string | null;
        }
      | null = null;

    try {
      setDocumentUploadLoading(options.type);
      setError(null);

      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          "application/pdf",
          "image/*",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ],
      });

      if (picked.canceled || !picked.assets?.length) {
        return;
      }

      const asset = picked.assets[0];
      if (!asset.uri || !asset.name) {
        throw new Error("Odabrani dokument nije ispravan.");
      }
      selectedAsset = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      };

      if (options.mode === "pod") {
        await uploadDriverProofOfDelivery({
          fileUri: selectedAsset.uri,
          fileName: selectedAsset.name,
          mimeType: selectedAsset.mimeType,
          loadId: dashboard!.activeLoad!.id,
        });
      } else {
        await uploadDriverGeneralDocument({
          fileUri: selectedAsset.uri,
          fileName: selectedAsset.name,
          mimeType: selectedAsset.mimeType,
          driverId: user.driver.id,
          type: options.type as Extract<
            DriverDocumentType,
            "OTHER" | "CDL_LICENSE" | "MEDICAL_CARD" | "INSURANCE" | "REGISTRATION"
          >,
        });
      }

      await refreshDocuments();
    } catch (err: any) {
      if (user?.id && user?.driver?.id && selectedAsset && isOfflineLikeError(err)) {
        if (options.mode === "pod" && dashboard?.activeLoad?.id) {
          await queueDriverOfflineAction({
            userId: user.id,
            type: "UPLOAD_POD",
            payload: {
              fileUri: selectedAsset.uri,
              fileName: selectedAsset.name,
              mimeType: selectedAsset.mimeType,
              loadId: dashboard.activeLoad.id,
            },
          });
        } else {
          await queueDriverOfflineAction({
            userId: user.id,
            type: "UPLOAD_DRIVER_DOCUMENT",
            payload: {
              fileUri: selectedAsset.uri,
              fileName: selectedAsset.name,
              mimeType: selectedAsset.mimeType,
              driverId: user.driver.id,
              documentType: (options.type === "POD" ? "OTHER" : options.type) as
                | "OTHER"
                | "CDL_LICENSE"
                | "MEDICAL_CARD"
                | "INSURANCE"
                | "REGISTRATION",
            },
          });
        }
        await refreshQueuedOfflineActionsCount();
      } else {
        setError(err?.message || "Upload dokumenta nije uspio.");
      }
    } finally {
      setDocumentUploadLoading(null);
    }
  }

  async function handleCreateInspection() {
    if (!dashboard?.primaryTruck?.id) {
      setError("Vozaču mora biti dodijeljen kamion prije kreiranja inspekcije.");
      return;
    }

    try {
      setInspectionSaving(true);
      setError(null);

      const created = await createDriverInspection({
        type: inspectionForm.type,
        status: inspectionForm.status,
        truckId: dashboard.primaryTruck.id,
        odometer: inspectionForm.odometer || undefined,
        defects: inspectionForm.defects,
        defectNotes: inspectionForm.defectNotes || undefined,
        notes: inspectionForm.notes || undefined,
        checklist: {
          lights: true,
          tires: true,
          brakes: true,
          cargo: !inspectionForm.defects,
        },
      });

      await refreshInspections();
      setSelectedInspectionId(created.inspection.id);
      setInspectionForm({
        type: "PRE_TRIP",
        status: "SAFE",
        odometer: "",
        defects: false,
        defectNotes: "",
        notes: "",
      });
    } catch (err: any) {
      if (user?.id && dashboard?.primaryTruck?.id && isOfflineLikeError(err)) {
        await queueDriverOfflineAction({
          userId: user.id,
          type: "CREATE_INSPECTION",
          payload: {
            type: inspectionForm.type,
            status: inspectionForm.status,
            truckId: dashboard.primaryTruck.id,
            odometer: inspectionForm.odometer || undefined,
            defects: inspectionForm.defects,
            defectNotes: inspectionForm.defectNotes || undefined,
            notes: inspectionForm.notes || undefined,
            checklist: {
              lights: true,
              tires: true,
              brakes: true,
              cargo: !inspectionForm.defects,
            },
          },
        });
        setInspectionForm({
          type: "PRE_TRIP",
          status: "SAFE",
          odometer: "",
          defects: false,
          defectNotes: "",
          notes: "",
        });
        await refreshQueuedOfflineActionsCount();
      } else {
        setError(err?.message || "Kreiranje inspekcije nije uspjelo.");
      }
    } finally {
      setInspectionSaving(false);
    }
  }

  async function handleUploadInspectionPhoto() {
    if (!selectedInspectionId) {
      setError("Prvo odaberite ili kreirajte inspekciju.");
      return;
    }

    let selectedAsset:
      | {
          uri: string;
          name: string;
          mimeType?: string | null;
        }
      | null = null;

    try {
      setInspectionPhotoUploading(true);
      setError(null);

      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ["image/*", "application/pdf"],
      });

      if (picked.canceled || !picked.assets?.length) {
        return;
      }

      const asset = picked.assets[0];
      if (!asset.uri || !asset.name) {
        throw new Error("Fotografija inspekcije nije ispravna.");
      }
      selectedAsset = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      };

      await uploadInspectionPhoto({
        fileUri: selectedAsset.uri,
        fileName: selectedAsset.name,
        mimeType: selectedAsset.mimeType,
        inspectionId: selectedInspectionId,
      });
      const inspectionDocuments = await fetchInspectionDocuments(selectedInspectionId);
      setSelectedInspectionDocuments(inspectionDocuments);
    } catch (err: any) {
      if (user?.id && selectedAsset && isOfflineLikeError(err)) {
        await queueDriverOfflineAction({
          userId: user.id,
          type: "UPLOAD_INSPECTION_PHOTO",
          payload: {
            fileUri: selectedAsset.uri,
            fileName: selectedAsset.name,
            mimeType: selectedAsset.mimeType,
            inspectionId: selectedInspectionId,
          },
        });
        await refreshQueuedOfflineActionsCount();
      } else {
        setError(err?.message || "Upload fotografije inspekcije nije uspio.");
      }
    } finally {
      setInspectionPhotoUploading(false);
    }
  }

  React.useEffect(() => {
    let cancelled = false;

    async function loadLoadDetail() {
      if (!selectedLoadId) {
        setSelectedLoadDetail(null);
        return;
      }

      try {
        setLoadDetailLoading(true);
        const detail = await fetchDriverLoadDetail(selectedLoadId);
        if (!cancelled) {
          setSelectedLoadDetail(detail);
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedLoadDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadDetailLoading(false);
        }
      }
    }

    void loadLoadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedLoadId]);

  React.useEffect(() => {
    if (!selectedLoadDetail?.load) {
      setLoadChecklist({});
      setDelayReasonDraft("");
      setPickupExceptionDraft("");
      setDeliveryExceptionDraft("");
      return;
    }

    setLoadChecklist((selectedLoadDetail.load.checklist as Record<string, boolean> | null) || {});
    setDelayReasonDraft(selectedLoadDetail.load.delayReason || "");
    setPickupExceptionDraft(selectedLoadDetail.load.pickupExceptionReason || "");
    setDeliveryExceptionDraft(selectedLoadDetail.load.deliveryExceptionReason || "");
  }, [selectedLoadDetail]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInspectionDetail() {
      if (!selectedInspectionId) {
        setSelectedInspectionDetail(null);
        setSelectedInspectionDocuments(null);
        return;
      }

      try {
        setInspectionDetailLoading(true);
        const [detail, inspectionDocuments] = await Promise.all([
          fetchDriverInspectionDetail(selectedInspectionId),
          fetchInspectionDocuments(selectedInspectionId),
        ]);
        if (!cancelled) {
          setSelectedInspectionDetail(detail);
          setSelectedInspectionDocuments(inspectionDocuments);
        }
      } catch (err) {
        if (!cancelled) {
          setSelectedInspectionDetail(null);
          setSelectedInspectionDocuments(null);
        }
      } finally {
        if (!cancelled) {
          setInspectionDetailLoading(false);
        }
      }
    }

    void loadInspectionDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedInspectionId]);

  const sectionButton = (key: DriverSection, label: string) => (
    <Pressable
      key={key}
      onPress={() => setSection(key)}
      style={{
        minWidth: "48%",
        minHeight: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: section === key ? "#111827" : "#e5e7eb",
      }}
    >
      <Text
        style={{
          color: section === key ? "#ffffff" : "#111827",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <>
      <Modal
        visible={Boolean(activeConfirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(17, 24, 39, 0.55)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 20,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
              {activeConfirmation?.type === "DRIVER_BORDER_EXIT_EU"
                ? "Potvrdite ulazak u EU"
                : "Potvrdite povratak u BiH"}
            </Text>
            <Text style={{ color: "#374151", lineHeight: 21 }}>
              {activeConfirmation?.message}
            </Text>
            {activeConfirmation?.data?.crossingAt ? (
              <Text style={{ color: "#4b5563" }}>
                Vrijeme: {formatConfirmationTime(activeConfirmation.data.crossingAt)}
              </Text>
            ) : null}
            {activeConfirmation?.data?.borderCrossingName ? (
              <Text style={{ color: "#4b5563" }}>
                Prelaz: {activeConfirmation.data.borderCrossingName}
              </Text>
            ) : null}
            {activeConfirmation?.data?.durationText ? (
              <Text style={{ color: "#4b5563" }}>
                Boravak van BiH: {activeConfirmation.data.durationText}
              </Text>
            ) : null}
            {typeof activeConfirmation?.data?.remainingDays === "number" ? (
              <Text style={{ color: "#4b5563" }}>
                Preostalo Schengen dana: {activeConfirmation.data.remainingDays}
              </Text>
            ) : null}
            <View style={{ gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() =>
                  activeConfirmation
                    ? void handleConfirmBorderEvent(activeConfirmation.id)
                    : undefined
                }
                disabled={confirmingId === activeConfirmation?.id}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#111827",
                  opacity: confirmingId === activeConfirmation?.id ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {confirmingId === activeConfirmation?.id
                    ? "Potvrđivanje..."
                    : activeConfirmation?.type === "DRIVER_BORDER_EXIT_EU"
                    ? "Potvrđujem ulazak u EU"
                    : "Potvrđujem povratak u BiH"}
                </Text>
              </Pressable>
              <Text style={{ color: "#6b7280", fontSize: 12, textAlign: "center" }}>
                Ako sada ne potvrdite, podsjetnik će vas čekati pri narednom otvaranju aplikacije.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1, backgroundColor: "#f7f7f5" }}>
        <View style={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>DRIVER</Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={{ fontSize: 15, color: "#4b5563" }}>
            Početni mobile ekran za vozača koristi isti backend kao web aplikacija.
          </Text>
        </View>

        {showSectionTabs ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {sectionButton("overview", "Pregled")}
            {sectionButton("schengen", "Schengen")}
            {sectionButton("replay", "Replay")}
            {sectionButton("loads", "Loads")}
            {sectionButton("documents", "Dokumenti")}
            {sectionButton("inspections", "Inspekcije")}
            {sectionButton(
              "inbox",
              `Inbox${inbox?.unreadCount ? ` (${inbox.unreadCount})` : ""}`
            )}
          </View>
        ) : null}

        {confirmationLoading ? null : pendingConfirmations.length > 0 ? (
          <View
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#f59e0b",
              gap: 4,
            }}
          >
            <Text style={{ color: "#92400e", fontWeight: "700" }}>
              Čeka potvrda prelaska granice
            </Text>
            <Text style={{ color: "#92400e" }}>
              Imate {pendingConfirmations.length} događaj(a) koji čekaju vašu potvrdu.
            </Text>
          </View>
        ) : queuedConfirmationsCount > 0 ? (
          <View
            style={{
              backgroundColor: "#dbeafe",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#60a5fa",
              gap: 4,
            }}
          >
            <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>
              Potvrde čekaju slanje
            </Text>
            <Text style={{ color: "#1d4ed8" }}>
              Sačuvano potvrda za kasnije slanje: {queuedConfirmationsCount}.
            </Text>
          </View>
        ) : queuedOfflineActionsCount > 0 ? (
          <View
            style={{
              backgroundColor: "#ecfccb",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#84cc16",
              gap: 4,
            }}
          >
            <Text style={{ color: "#3f6212", fontWeight: "700" }}>
              Offline radnje čekaju slanje
            </Text>
            <Text style={{ color: "#3f6212" }}>
              Sačuvano radnji za kasniju sinhronizaciju: {queuedOfflineActionsCount}.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color="#111827" />
          </View>
        ) : error ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Greška
            </Text>
            <Text style={{ color: "#b91c1c" }}>{error}</Text>
          </View>
        ) : activeSection === "overview" ? (
          <>
            {dashboard?.activeLoadWarning?.message ? (
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#f59e0b",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#92400e", fontWeight: "700" }}>
                  Upozorenje na više aktivnih loadova
                </Text>
                <Text style={{ color: "#92400e" }}>
                  {dashboard.activeLoadWarning.message}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Status
              </Text>
              <Text style={{ color: "#374151" }}>
                Status vozača: {dashboard?.driver.status || "-"}
              </Text>
              <Text style={{ color: "#374151" }}>
                Zadnja lokacija:{" "}
                {dashboard?.driver.lastLocationUpdate
                  ? new Date(dashboard.driver.lastLocationUpdate).toLocaleString()
                  : "Nema podatka"}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Dodijeljeni kamion
              </Text>
              {dashboard?.primaryTruck ? (
                <>
                  <Text style={{ color: "#374151" }}>
                    {dashboard.primaryTruck.truckNumber} • {dashboard.primaryTruck.make}{" "}
                    {dashboard.primaryTruck.model}
                  </Text>
                  <Text style={{ color: "#374151" }}>
                    Tablice: {dashboard.primaryTruck.licensePlate}
                  </Text>
                </>
              ) : (
                <Text style={{ color: "#6b7280" }}>Kamion nije dodijeljen.</Text>
              )}
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Aktivni load
              </Text>
              {dashboard?.activeLoad ? (
                <>
                  <Text style={{ color: "#374151" }}>
                    {dashboard.activeLoad.loadNumber} • {dashboard.activeLoad.status}
                  </Text>
                  <Text style={{ color: "#374151" }}>
                    {dashboard.activeLoad.pickupCity}, {dashboard.activeLoad.pickupState} →{" "}
                    {dashboard.activeLoad.deliveryCity}, {dashboard.activeLoad.deliveryState}
                  </Text>
                </>
              ) : (
                <Text style={{ color: "#6b7280" }}>Nema aktivnog loada.</Text>
              )}
            </View>
          </>
        ) : activeSection === "schengen" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Schengen 90/180
              </Text>
              <Text style={{ color: "#374151" }}>
                Iskorišteno dana: {schengen?.usedDays ?? "-"}
              </Text>
              <Text style={{ color: "#374151" }}>
                Preostalo dana: {schengen?.remainingDays ?? "-"}
              </Text>
              <Text style={{ color: "#374151" }}>
                Period:{" "}
                {schengen
                  ? `${new Date(schengen.from).toLocaleDateString()} - ${new Date(
                      schengen.to
                    ).toLocaleDateString()}`
                  : "-"}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Prelasci granice
              </Text>

              {schengen?.borderCrossings?.length ? (
                schengen.borderCrossings.slice(0, 8).map((crossing, index) => (
                  <Pressable
                    key={`${crossing.recordedAt}-${index}`}
                    onPress={() =>
                      void loadReplayWindow({
                        startDate: new Date(
                          new Date(crossing.recordedAt).getTime() - 3 * 60 * 60 * 1000
                        ),
                        endDate: new Date(
                          new Date(crossing.recordedAt).getTime() + 3 * 60 * 60 * 1000
                        ),
                        label:
                          crossing.type === "EXIT_BIH"
                            ? "Replay oko izlaza iz BiH"
                            : "Replay oko ulaza u BiH",
                        focusPoint: {
                          latitude: crossing.latitude,
                          longitude: crossing.longitude,
                          label:
                            crossing.nearestBorderCrossing?.name ||
                            (crossing.type === "EXIT_BIH"
                              ? "Izlaz iz BiH"
                              : "Ulaz u BiH"),
                        },
                      })
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontWeight: "600", color: "#111827" }}>
                      {crossing.type === "EXIT_BIH" ? "Izlaz iz BiH" : "Ulaz u BiH"}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      {new Date(crossing.recordedAt).toLocaleString()}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      {crossing.nearestBorderCrossing?.name ||
                        `${crossing.latitude.toFixed(5)}, ${crossing.longitude.toFixed(5)}`}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      Dodirni za replay oko prelaska
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Nema evidentiranih prelazaka.</Text>
              )}
            </View>
          </>
        ) : activeSection === "replay" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                {replayLabel}
              </Text>
              <Text style={{ color: "#374151" }}>
                Ukupno pozicija: {replay?.statistics.totalPositions ?? "-"}
              </Text>
              <Text style={{ color: "#374151" }}>
                Prosj. brzina: {replay?.statistics.avgSpeed ?? "-"} km/h
              </Text>
              <Text style={{ color: "#374151" }}>
                Distanca: {replay?.statistics.totalDistance ?? "-"} km
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Zadnje tačke
              </Text>
              <ReplayMapView
                points={replay?.positions || []}
                focusPoint={replayFocusPoint}
              />
              {replay?.positions?.length ? (
                replay.positions
                  .slice(-8)
                  .reverse()
                  .map((position) => (
                    <View
                      key={position.id}
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        gap: 4,
                      }}
                    >
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        {new Date(position.recordedAt).toLocaleString()}
                      </Text>
                      <Text style={{ color: "#374151" }}>
                        {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Brzina: {position.speed ?? 0} km/h
                      </Text>
                    </View>
                  ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Nema pozicija za prikaz.</Text>
              )}
            </View>
          </>
        ) : activeSection === "documents" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Brzi upload
              </Text>

              <Pressable
                onPress={() => void pickAndUploadDocument({ type: "OTHER", mode: "driver" })}
                disabled={Boolean(documentUploadLoading)}
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: "#111827",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: documentUploadLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {documentUploadLoading === "OTHER"
                    ? "Upload u toku..."
                    : "Dodaj dokument vozača"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  void pickAndUploadDocument({ type: "CDL_LICENSE", mode: "driver" })
                }
                disabled={Boolean(documentUploadLoading)}
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: documentUploadLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  {documentUploadLoading === "CDL_LICENSE"
                    ? "Upload u toku..."
                    : "Dodaj vozačku dozvolu"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  void pickAndUploadDocument({ type: "MEDICAL_CARD", mode: "driver" })
                }
                disabled={Boolean(documentUploadLoading)}
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: documentUploadLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "700" }}>
                  {documentUploadLoading === "MEDICAL_CARD"
                    ? "Upload u toku..."
                    : "Dodaj ljekarsko uvjerenje"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => void pickAndUploadDocument({ type: "POD", mode: "pod" })}
                disabled={Boolean(documentUploadLoading) || !dashboard?.activeLoad?.id}
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: dashboard?.activeLoad?.id ? "#14532d" : "#d1d5db",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: documentUploadLoading ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {documentUploadLoading === "POD"
                    ? "Upload u toku..."
                    : dashboard?.activeLoad?.id
                    ? `Dodaj POD za ${dashboard.activeLoad.loadNumber}`
                    : "Nema aktivnog loada za POD"}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Posljednji dokumenti
              </Text>

              {sortedDocuments.length ? (
                sortedDocuments.map((document) => (
                  <View
                    key={document.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      gap: 4,
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {DRIVER_DOCUMENT_TYPE_LABELS[document.type] || document.type}
                    </Text>
                    <Text style={{ color: "#374151" }}>{document.fileName}</Text>
                    <Text style={{ color: "#4b5563" }}>
                      Dodano: {new Date(document.createdAt).toLocaleString()}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      Veličina: {formatFileSize(document.fileSize)}
                    </Text>
                    {document.load?.loadNumber ? (
                      <Text style={{ color: "#4b5563" }}>
                        Load: {document.load.loadNumber}
                      </Text>
                    ) : null}
                    {document.expiryDate ? (
                      <Text style={{ color: "#4b5563" }}>
                        Važi do: {new Date(document.expiryDate).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Još nema uploadovanih dokumenata.</Text>
              )}
            </View>
          </>
        ) : activeSection === "inspections" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Nova inspekcija
              </Text>
              <Text style={{ color: "#374151" }}>
                Kamion: {dashboard?.primaryTruck?.truckNumber || "Nije dodijeljen"}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {(["PRE_TRIP", "POST_TRIP"] as DriverInspectionType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setInspectionForm((current) => ({ ...current, type }))}
                    style={{
                      minHeight: 42,
                      minWidth: "48%",
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        inspectionForm.type === type ? "#111827" : "#e5e7eb",
                    }}
                  >
                    <Text
                      style={{
                        color: inspectionForm.type === type ? "#ffffff" : "#111827",
                        fontWeight: "600",
                      }}
                    >
                      {INSPECTION_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {(["SAFE", "UNSAFE", "NEEDS_REPAIR"] as DriverInspectionStatus[]).map(
                  (status) => (
                    <Pressable
                      key={status}
                      onPress={() => setInspectionForm((current) => ({ ...current, status }))}
                      style={{
                        minHeight: 42,
                        minWidth: "31%",
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          inspectionForm.status === status ? "#111827" : "#e5e7eb",
                      }}
                    >
                      <Text
                        style={{
                          color: inspectionForm.status === status ? "#ffffff" : "#111827",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        {INSPECTION_STATUS_LABELS[status]}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>

              <TextInput
                value={inspectionForm.odometer}
                onChangeText={(value) =>
                  setInspectionForm((current) => ({ ...current, odometer: value }))
                }
                keyboardType="numeric"
                placeholder="Kilometraža"
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  paddingHorizontal: 12,
                  backgroundColor: "#ffffff",
                }}
              />

              <TextInput
                value={inspectionForm.notes}
                onChangeText={(value) =>
                  setInspectionForm((current) => ({ ...current, notes: value }))
                }
                placeholder="Napomena"
                multiline
                style={{
                  minHeight: 72,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: "#ffffff",
                  textAlignVertical: "top",
                }}
              />

              <Pressable
                onPress={() =>
                  setInspectionForm((current) => ({
                    ...current,
                    defects: !current.defects,
                    defectNotes: !current.defects ? current.defectNotes : "",
                  }))
                }
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: inspectionForm.defects ? "#b91c1c" : "#d1d5db",
                  backgroundColor: inspectionForm.defects ? "#fee2e2" : "#ffffff",
                  paddingHorizontal: 12,
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "600" }}>
                  {inspectionForm.defects
                    ? "Evidentirani su nedostaci"
                    : "Nema evidentiranih nedostataka"}
                </Text>
              </Pressable>

              {inspectionForm.defects ? (
                <TextInput
                  value={inspectionForm.defectNotes}
                  onChangeText={(value) =>
                    setInspectionForm((current) => ({ ...current, defectNotes: value }))
                  }
                  placeholder="Opis nedostataka"
                  multiline
                  style={{
                    minHeight: 72,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#fca5a5",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "#ffffff",
                    textAlignVertical: "top",
                  }}
                />
              ) : null}

              <Pressable
                onPress={() => void handleCreateInspection()}
                disabled={inspectionSaving || !dashboard?.primaryTruck?.id}
                style={{
                  minHeight: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: dashboard?.primaryTruck?.id ? "#111827" : "#d1d5db",
                  opacity: inspectionSaving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {inspectionSaving ? "Spremanje..." : "Sačuvaj inspekciju"}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Moje inspekcije
              </Text>

              {inspections?.inspections?.length ? (
                inspections.inspections.map((inspection) => (
                  <Pressable
                    key={inspection.id}
                    onPress={() =>
                      setSelectedInspectionId((current) =>
                        current === inspection.id ? null : inspection.id
                      )
                    }
                    style={{
                      borderWidth: 1,
                      borderColor:
                        selectedInspectionId === inspection.id ? "#111827" : "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      gap: 4,
                      backgroundColor:
                        selectedInspectionId === inspection.id ? "#f3f4f6" : "#ffffff",
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {INSPECTION_TYPE_LABELS[inspection.type]} •{" "}
                      {INSPECTION_STATUS_LABELS[inspection.status]}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      {new Date(inspection.createdAt).toLocaleString()}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      Kamion: {inspection.truck.truckNumber}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Još nema evidentiranih inspekcija.</Text>
              )}
            </View>

            {selectedInspectionId ? (
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Detalji inspekcije
                </Text>

                {inspectionDetailLoading ? (
                  <ActivityIndicator color="#111827" />
                ) : selectedInspectionDetail?.inspection ? (
                  <>
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {INSPECTION_TYPE_LABELS[selectedInspectionDetail.inspection.type]} •{" "}
                      {INSPECTION_STATUS_LABELS[selectedInspectionDetail.inspection.status]}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Kamion: {selectedInspectionDetail.inspection.truck.truckNumber}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Kilometraža: {selectedInspectionDetail.inspection.odometer ?? "-"}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Nedostaci:{" "}
                      {selectedInspectionDetail.inspection.defects ? "Da" : "Ne"}
                    </Text>
                    {selectedInspectionDetail.inspection.defectNotes ? (
                      <Text style={{ color: "#374151" }}>
                        Opis nedostataka:{" "}
                        {selectedInspectionDetail.inspection.defectNotes}
                      </Text>
                    ) : null}
                    {selectedInspectionDetail.inspection.notes ? (
                      <Text style={{ color: "#374151" }}>
                        Napomena: {selectedInspectionDetail.inspection.notes}
                      </Text>
                    ) : null}

                    <Pressable
                      onPress={() => void handleUploadInspectionPhoto()}
                      disabled={inspectionPhotoUploading}
                      style={{
                        minHeight: 46,
                        borderRadius: 12,
                        backgroundColor: "#1d4ed8",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: inspectionPhotoUploading ? 0.7 : 1,
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                        {inspectionPhotoUploading
                          ? "Upload u toku..."
                          : "Dodaj fotografiju inspekcije"}
                      </Text>
                    </Pressable>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        Prilozi inspekcije
                      </Text>
                      {selectedInspectionDocuments?.documents?.length ? (
                        selectedInspectionDocuments.documents.map((document) => (
                          <Text key={document.id} style={{ color: "#4b5563" }}>
                            {DRIVER_DOCUMENT_TYPE_LABELS[document.type] || document.type} •{" "}
                            {document.fileName}
                          </Text>
                        ))
                      ) : (
                        <Text style={{ color: "#6b7280" }}>
                          Još nema priloga za ovu inspekciju.
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  <Text style={{ color: "#6b7280" }}>
                    Detalji inspekcije nisu dostupni.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        ) : activeSection === "inbox" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Inbox notifikacija
              </Text>
              <Text style={{ color: "#374151" }}>
                Nepročitanih: {inbox?.unreadCount ?? 0}
              </Text>
              <Pressable
                onPress={() => void handleMarkAllDriverNotificationsRead()}
                disabled={inboxActionLoading === "all" || !inbox?.unreadCount}
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  backgroundColor: inbox?.unreadCount ? "#111827" : "#d1d5db",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: inboxActionLoading === "all" ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {inboxActionLoading === "all"
                    ? "Ažuriranje..."
                    : "Označi sve kao pročitano"}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              {inbox?.notifications?.length ? (
                inbox.notifications.map((notification) => (
                  <Pressable
                    key={notification.id}
                    onPress={() =>
                      notification.readAt
                        ? undefined
                        : void handleMarkDriverNotificationRead(notification.id)
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: notification.readAt ? "#e5e7eb" : "#60a5fa",
                      borderRadius: 12,
                      padding: 12,
                      gap: 4,
                      backgroundColor: notification.readAt ? "#ffffff" : "#eff6ff",
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "700" }}>
                      {notification.title}
                    </Text>
                    <Text style={{ color: "#374151" }}>{notification.message}</Text>
                    <Text style={{ color: "#4b5563" }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </Text>
                    {notification.data?.borderCrossingName ? (
                      <Text style={{ color: "#4b5563" }}>
                        Prelaz: {notification.data.borderCrossingName}
                      </Text>
                    ) : null}
                    {notification.data?.durationText ? (
                      <Text style={{ color: "#4b5563" }}>
                        Boravak: {notification.data.durationText}
                      </Text>
                    ) : null}
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      {notification.confirmedAt
                        ? `Potvrđeno: ${new Date(notification.confirmedAt).toLocaleString()}`
                        : notification.requiresConfirmation
                        ? "Čeka potvrdu vozača"
                        : notification.readAt
                        ? `Pročitano: ${new Date(notification.readAt).toLocaleString()}`
                        : "Dodirni da označiš kao pročitano"}
                    </Text>
                    {inboxActionLoading === notification.id ? (
                      <Text style={{ color: "#1d4ed8", fontSize: 12 }}>
                        Označavanje u toku...
                      </Text>
                    ) : null}
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Još nema app notifikacija.</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Moji loadovi
              </Text>
              <Text style={{ color: "#374151" }}>
                Ukupno loadova: {loads?.pagination.total ?? 0}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 10,
              }}
            >
              {loads?.loads?.length ? (
                loads.loads.map((load) => (
                  <Pressable
                    key={load.id}
                    onPress={() =>
                      setSelectedLoadId((current) => (current === load.id ? null : load.id))
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: selectedLoadId === load.id ? "#111827" : "#e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      gap: 4,
                      backgroundColor: selectedLoadId === load.id ? "#f3f4f6" : "#ffffff",
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {load.loadNumber} • {load.status}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      {load.pickupCity}, {load.pickupState} → {load.deliveryCity},{" "}
                      {load.deliveryState}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      Pickup: {new Date(load.scheduledPickupDate).toLocaleDateString()}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={{ color: "#6b7280" }}>Nema loadova za prikaz.</Text>
              )}
            </View>

            {selectedLoadId ? (
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  gap: 10,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Detalji loada
                </Text>

                {loadDetailLoading ? (
                  <ActivityIndicator color="#111827" />
                ) : selectedLoadDetail?.load ? (
                  <>
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {selectedLoadDetail.load.loadNumber} • {selectedLoadDetail.load.status}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Pickup: {selectedLoadDetail.load.pickupAddress},{" "}
                      {selectedLoadDetail.load.pickupCity}, {selectedLoadDetail.load.pickupState}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Delivery: {selectedLoadDetail.load.deliveryAddress},{" "}
                      {selectedLoadDetail.load.deliveryCity},{" "}
                      {selectedLoadDetail.load.deliveryState}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Pickup kontakt: {selectedLoadDetail.load.pickupContactName} •{" "}
                      {selectedLoadDetail.load.pickupContactPhone}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Delivery kontakt: {selectedLoadDetail.load.deliveryContactName} •{" "}
                      {selectedLoadDetail.load.deliveryContactPhone}
                    </Text>

                    {selectedLoadDetail.load.truck ? (
                      <Text style={{ color: "#374151" }}>
                        Kamion: {selectedLoadDetail.load.truck.truckNumber} •{" "}
                        {selectedLoadDetail.load.truck.make}{" "}
                        {selectedLoadDetail.load.truck.model}
                      </Text>
                    ) : null}

                    {selectedLoadDetail.load.notes ? (
                      <Text style={{ color: "#374151" }}>
                        Napomena: {selectedLoadDetail.load.notes}
                      </Text>
                    ) : null}

                    {selectedLoadDetail.load.specialInstructions ? (
                      <Text style={{ color: "#374151" }}>
                        Upute: {selectedLoadDetail.load.specialInstructions}
                      </Text>
                    ) : null}

                    <View style={{ gap: 8 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        Brze akcije
                      </Text>
                      {selectedLoadDetail.load.status === "ASSIGNED" ? (
                        <Pressable
                          onPress={() => void handleLoadStatusAction("pickup")}
                          disabled={Boolean(loadStatusUpdating)}
                          style={{
                            minHeight: 44,
                            borderRadius: 12,
                            backgroundColor: "#14532d",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loadStatusUpdating ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                            {loadStatusUpdating === "pickup"
                              ? "Ažuriranje..."
                              : "Označi kao preuzeto"}
                          </Text>
                        </Pressable>
                      ) : null}

                      {selectedLoadDetail.load.status === "PICKED_UP" ? (
                        <Pressable
                          onPress={() => void handleLoadStatusAction("start_transit")}
                          disabled={Boolean(loadStatusUpdating)}
                          style={{
                            minHeight: 44,
                            borderRadius: 12,
                            backgroundColor: "#1d4ed8",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loadStatusUpdating ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                            {loadStatusUpdating === "start_transit"
                              ? "Ažuriranje..."
                              : "Označi kao u transportu"}
                          </Text>
                        </Pressable>
                      ) : null}

                      {(selectedLoadDetail.load.status === "IN_TRANSIT" ||
                        selectedLoadDetail.load.status === "PICKED_UP") ? (
                        <Pressable
                          onPress={() => void handleLoadStatusAction("deliver")}
                          disabled={Boolean(loadStatusUpdating)}
                          style={{
                            minHeight: 44,
                            borderRadius: 12,
                            backgroundColor: "#7c2d12",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: loadStatusUpdating ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                            {loadStatusUpdating === "deliver"
                              ? "Ažuriranje..."
                              : "Označi kao isporučeno"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={{ gap: 8 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        Checklist loada
                      </Text>
                      {[
                        ["pickupContacted", "Kontaktiran pickup"],
                        ["cargoSecured", "Teret preuzet / osiguran"],
                        ["deliveryContacted", "Kontaktirana dostava"],
                        ["podUploaded", "POD uploadovan"],
                      ].map(([key, label]) => (
                        <Pressable
                          key={key}
                          onPress={() =>
                            setLoadChecklist((current) => ({
                              ...current,
                              [key]: !current[key],
                            }))
                          }
                          style={{
                            minHeight: 42,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: loadChecklist[key] ? "#16a34a" : "#d1d5db",
                            backgroundColor: loadChecklist[key] ? "#dcfce7" : "#ffffff",
                            justifyContent: "center",
                            paddingHorizontal: 12,
                          }}
                        >
                          <Text style={{ color: "#111827", fontWeight: "600" }}>
                            {loadChecklist[key] ? "✓ " : ""}{label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={{ gap: 8 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        Razlozi izuzetaka
                      </Text>
                      <TextInput
                        value={delayReasonDraft}
                        onChangeText={setDelayReasonDraft}
                        placeholder="Razlog kašnjenja"
                        multiline
                        style={{
                          minHeight: 64,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#d1d5db",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#ffffff",
                          textAlignVertical: "top",
                        }}
                      />
                      <TextInput
                        value={pickupExceptionDraft}
                        onChangeText={setPickupExceptionDraft}
                        placeholder="Razlog neuspješnog pickup-a"
                        multiline
                        style={{
                          minHeight: 64,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#d1d5db",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#ffffff",
                          textAlignVertical: "top",
                        }}
                      />
                      <TextInput
                        value={deliveryExceptionDraft}
                        onChangeText={setDeliveryExceptionDraft}
                        placeholder="Razlog neuspješne dostave"
                        multiline
                        style={{
                          minHeight: 64,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#d1d5db",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: "#ffffff",
                          textAlignVertical: "top",
                        }}
                      />
                      <Pressable
                        onPress={() => void handleSaveLoadOps()}
                        disabled={loadOpsSaving}
                        style={{
                          minHeight: 44,
                          borderRadius: 12,
                          backgroundColor: "#111827",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: loadOpsSaving ? 0.7 : 1,
                        }}
                      >
                        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                          {loadOpsSaving ? "Spremanje..." : "Sačuvaj operativne podatke"}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>
                        Status timeline
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Zahtjev kreiran: {formatOptionalDate(selectedLoadDetail.load.requestedAt)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Odobreno: {formatOptionalDate(selectedLoadDetail.load.approvedAt)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Dodijeljeno: {formatOptionalDate(selectedLoadDetail.load.assignedAt)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Pickup plan: {formatOptionalDate(selectedLoadDetail.load.scheduledPickupDate)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Pickup stvarno: {formatOptionalDate(selectedLoadDetail.load.actualPickupDate)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        In transit: {formatOptionalDate(selectedLoadDetail.load.inTransitAt)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Delivery plan: {formatOptionalDate(
                          selectedLoadDetail.load.scheduledDeliveryDate
                        )}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Delivery stvarno:{" "}
                        {formatOptionalDate(selectedLoadDetail.load.actualDeliveryDate)}
                      </Text>
                      <Text style={{ color: "#4b5563" }}>
                        Završeno: {formatOptionalDate(selectedLoadDetail.load.completedAt)}
                      </Text>
                    </View>

                    <View style={{ gap: 6 }}>
                      <Text style={{ color: "#111827", fontWeight: "600" }}>Stopovi</Text>
                      {selectedLoadDetail.load.stops.map((stop) => (
                        <Text key={stop.id} style={{ color: "#4b5563" }}>
                          {stop.sequence}. {stop.type} • {stop.address}, {stop.city},{" "}
                          {stop.state}
                        </Text>
                      ))}
                    </View>

                    {selectedLoadDetail.load.vehicles.length ? (
                      <View style={{ gap: 6 }}>
                        <Text style={{ color: "#111827", fontWeight: "600" }}>Vozila</Text>
                        {selectedLoadDetail.load.vehicles.map((vehicle) => (
                          <Text key={vehicle.id} style={{ color: "#4b5563" }}>
                            {vehicle.year} {vehicle.make} {vehicle.model} • VIN {vehicle.vin}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ color: "#6b7280" }}>
                    Detalji loada nisu dostupni.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}

        <Pressable
          onPress={() => void signOut()}
          style={{
            minHeight: 48,
            borderRadius: 12,
            backgroundColor: "#111827",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Odjava
          </Text>
        </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
