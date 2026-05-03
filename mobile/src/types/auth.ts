export type MobileUserRole = "ADMIN" | "DISPATCHER" | "DRIVER" | "CLIENT";

export type MobileDriver = {
  id: string;
};

export type MobileUser = {
  id: string;
  email: string;
  role: MobileUserRole;
  firstName: string;
  lastName: string;
  driver?: MobileDriver | null;
};

export type LoginResponse = {
  user: MobileUser;
  token: string;
  refreshToken: string;
};

export type MeResponse = {
  user: MobileUser;
};

export type RefreshResponse = {
  user: MobileUser;
  token: string;
  refreshToken: string;
};
