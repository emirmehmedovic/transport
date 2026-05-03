export type PendingDriverConfirmationType =
  | "DRIVER_BORDER_EXIT_EU"
  | "DRIVER_BORDER_RETURN_BIH";

export type PendingDriverConfirmation = {
  id: string;
  type: PendingDriverConfirmationType;
  title: string;
  message: string;
  createdAt: string;
  data?: {
    crossingType?: string;
    crossingAt?: string;
    latitude?: number | null;
    longitude?: number | null;
    borderCrossingName?: string | null;
    durationText?: string;
    usedDays?: number;
    remainingDays?: number;
  } | null;
};

export type PendingDriverConfirmationsResponse = {
  notifications: PendingDriverConfirmation[];
};

export type DriverInboxNotification = {
  id: string;
  type: "DRIVER_BORDER_EXIT_EU" | "DRIVER_BORDER_RETURN_BIH" | "DRIVER_SCHENGEN_REMINDER";
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  requiresConfirmation: boolean;
  confirmedAt: string | null;
  pushSentAt: string | null;
  pushStatus: string | null;
  data?: {
    crossingType?: string;
    crossingAt?: string;
    latitude?: number | null;
    longitude?: number | null;
    borderCrossingName?: string | null;
    durationText?: string;
    usedDays?: number;
    remainingDays?: number;
  } | null;
};

export type DriverInboxNotificationsResponse = {
  notifications: DriverInboxNotification[];
  unreadCount: number;
};
