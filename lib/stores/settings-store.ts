"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export interface Settings {
  theme: "light" | "dark" | "system";
  units: {
    temperature: "celsius" | "fahrenheit";
    distance: "cm" | "inches";
    gasLevel: "ppm" | "percent";
  };
  notifications: {
    enabled: boolean;
    email: string;
    emailVerified: boolean;
    audio: boolean;
  };
  updateInterval: number;
}

interface SettingsState {
  settings: Settings;
  setTheme: (theme: Settings["theme"]) => void;
  setUnits: (units: Settings["units"]) => void;
  setNotifications: (notifications: Settings["notifications"]) => void;
  setUpdateInterval: (interval: number) => void;
  saveSettings: () => Promise<void>;
}

const SENSOR_CONFIG_ID = "sensor-config";

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  units: {
    temperature: "celsius",
    distance: "cm",
    gasLevel: "ppm",
  },
  notifications: {
    enabled: false,
    email: "",
    emailVerified: false,
    audio: true,
  },
  updateInterval: 300, // 5 minutes in seconds
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),
      setUnits: (units) =>
        set((state) => ({
          settings: { ...state.settings, units },
        })),
      setNotifications: (notifications) =>
        set((state) => ({
          settings: { ...state.settings, notifications },
        })),
      setUpdateInterval: (updateInterval) =>
        set((state) => ({
          settings: { ...state.settings, updateInterval },
        })),
      saveSettings: async () => {
        const state = get();
        // Only save update interval to Firestore
        await setDoc(doc(db, "config", SENSOR_CONFIG_ID), {
          updateInterval: state.settings.updateInterval,
        });
      },
    }),
    {
      name: "settings-storage",
      // Optional: You can specify which parts of the state to persist
      partialize: (state) => ({
        settings: {
          theme: state.settings.theme,
          units: state.settings.units,
          notifications: state.settings.notifications,
          updateInterval: state.settings.updateInterval,
        },
      }),
    }
  )
);
