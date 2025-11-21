"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log("ProtectedRoute - loading:", loading, "user:", user);

    if (!loading && !user) {
      console.log("No user, redirecting to login");
      router.push("/login");
    }

    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      console.log("User role not allowed, redirecting to dashboard");
      router.push("/");
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
          <p className="text-dark-500">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Nemate dozvolu za pristup ovoj stranici.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
