"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  driver?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sessionVerified = useRef(false);

  useEffect(() => {
    // Check if user is logged in on mount
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Error parsing user:", error);
          localStorage.removeItem("user");
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading || sessionVerified.current) return;
    sessionVerified.current = true;

    const verifySession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
          if (typeof window !== "undefined" && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
          }
          return;
        }

        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!refreshRes.ok) {
          throw new Error("Session expired");
        }

        const refreshData = await refreshRes.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(refreshData.user));
        }
        setUser(refreshData.user || null);
      } catch (error) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
        }
        setUser(null);
        router.push("/login");
      }
    };

    verifySession();
  }, [loading, router]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();
    console.log("Login successful:", data.user);

    if (typeof window !== 'undefined') {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    setUser(data.user);

    // Force a small delay to ensure state is updated
    setTimeout(() => {
      router.push("/dashboard");
    }, 100);
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("user");
      }
      setUser(null);
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        if (typeof window !== 'undefined' && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
