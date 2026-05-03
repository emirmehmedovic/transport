import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/auth-store";

export function useSessionBootstrap() {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
}
