import { create } from "zustand";
import { fetchMe, login, logout } from "@/features/auth/auth-api";
import { getAccessToken } from "@/lib/token-storage";
import type { MobileUser } from "@/types/auth";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthStore = {
  status: AuthStatus;
  user: MobileUser | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  status: "idle",
  user: null,

  bootstrap: async () => {
    set({ status: "loading" });

    const token = await getAccessToken();
    if (!token) {
      set({ status: "unauthenticated", user: null });
      return;
    }

    try {
      const me = await fetchMe();
      set({
        status: "authenticated",
        user: me.user,
      });
    } catch {
      set({
        status: "unauthenticated",
        user: null,
      });
    }
  },

  signIn: async (email, password) => {
    set({ status: "loading" });

    await login(email, password);
    const me = await fetchMe();

    set({
      status: "authenticated",
      user: me.user,
    });
  },

  signOut: async () => {
    await logout();
    set({
      status: "unauthenticated",
      user: null,
    });
  },
}));
