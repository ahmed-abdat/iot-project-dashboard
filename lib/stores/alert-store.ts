"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const ALERT_DEFAULTS = {
  temperature: {
    unit: "°C",
    min: -40,
    max: 85,
    step: 0.1,
  },
  humidity: {
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  pressure: {
    unit: "hPa",
    min: 300,
    max: 1100,
    step: 1,
  },
} as const;

export interface Alert {
  id: string;
  type: "temperature" | "humidity" | "pressure";
  operator: "above" | "below" | "between";
  threshold: number;
  thresholdHigh?: number;
  message: string;
  priority: "low" | "medium" | "high";
  status: "active" | "inactive" | "triggered";
  lastTriggered?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateAlertInput = Omit<
  Alert,
  "id" | "status" | "lastTriggered" | "createdAt" | "updatedAt"
>;

interface AlertStore {
  alerts: Alert[];
  initialized: boolean;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, alert: Partial<Alert>) => void;
  deleteAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  getAlert: (id: string) => Alert | undefined;
  initialize: () => void;
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      initialized: false,
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) =>
        set((state) => ({ alerts: [...state.alerts, alert] })),
      updateAlert: (id, updatedAlert) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  ...updatedAlert,
                  updatedAt: new Date().toISOString(),
                }
              : alert
          ),
        })),
      deleteAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        })),
      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  status: alert.status === "active" ? "inactive" : "active",
                  updatedAt: new Date().toISOString(),
                }
              : alert
          ),
        })),
      getAlert: (id) => get().alerts.find((alert) => alert.id === id),
      initialize: () => {
        if (!get().initialized) {
          try {
            const storedData = localStorage.getItem("sensor-alerts");
            if (storedData) {
              const { state } = JSON.parse(storedData);
              if (state?.alerts) {
                set({ alerts: state.alerts, initialized: true });
              }
            }
          } catch (error) {
            console.error("Failed to load stored alerts:", error);
          } finally {
            set({ initialized: true });
          }
        }
      },
    }),
    {
      name: "sensor-alerts",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialized = true;
        }
      },
      skipHydration: true,
    }
  )
);
