"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

export interface Settings {
  theme: "light" | "dark" | "system";
  updateInterval: number;
}

interface SettingsState {
  settings: Settings;
  setTheme: (theme: Settings["theme"]) => void;
  setUpdateInterval: (interval: number) => void;
  saveSettings: () => Promise<void>;
}

const SENSOR_CONFIG_ID = "sensor-config";

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  updateInterval: 0, // 0 = real-time, >0 = polling interval in seconds
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),
      setUpdateInterval: (updateInterval) =>
        set((state) => ({
          settings: { ...state.settings, updateInterval },
        })),
      saveSettings: async () => {
        const state = get();
        await setDoc(doc(db, "config", SENSOR_CONFIG_ID), {
          updateInterval: state.settings.updateInterval,
        });
      },
    }),
    {
      name: "settings-storage",
      partialize: (state) => ({
        settings: {
          theme: state.settings.theme,
          updateInterval: state.settings.updateInterval,
        },
      }),
    }
  )
);
