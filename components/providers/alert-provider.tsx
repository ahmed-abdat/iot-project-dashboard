"use client";

import { useEffect } from "react";
import { useAlertStore } from "@/lib/stores/alert-store";

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const alertStore = useAlertStore();

  // Initialize alerts only once when the component mounts
  useEffect(() => {
    if (!alertStore.initialized) {
      alertStore.initialize();
    }
  }, [alertStore]);

  return <>{children}</>;
}
