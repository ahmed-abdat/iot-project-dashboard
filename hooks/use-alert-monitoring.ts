"use client";

import { useEffect, useCallback } from "react";
import { useAlertStore, type Alert } from "@/lib/stores/alert-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import {
  convertTemperature,
  convertPressure,
} from "@/lib/utils/unit-conversions";
import { toast } from "sonner";

interface SensorData {
  temperature: number;
  humidity: number;
  pressure: number;
  distance: number;
}

export function useAlertMonitoring() {
  const alerts = useAlertStore((state) => state.alerts);
  const updateAlert = useAlertStore((state) => state.updateAlert);
  const settings = useSettingsStore((state) => state.settings);

  // Convert threshold values to current units
  const convertThreshold = useCallback(
    (alert: Alert, value: number) => {
      switch (alert.type) {
        case "temperature":
          return convertTemperature(value, settings.units.temperature);
        case "pressure":
          return convertPressure(value, settings.units.pressure);
        default:
          return value;
      }
    },
    [settings.units]
  );

  // Check if a value triggers an alert
  const checkAlertCondition = useCallback(
    (alert: Alert, value: number) => {
      const threshold = convertThreshold(alert, alert.threshold);
      const thresholdHigh = alert.thresholdHigh
        ? convertThreshold(alert, alert.thresholdHigh)
        : undefined;

      switch (alert.operator) {
        case "above":
          return value > threshold;
        case "below":
          return value < threshold;
        case "between":
          return thresholdHigh !== undefined
            ? value >= threshold && value <= thresholdHigh
            : false;
        default:
          return false;
      }
    },
    [convertThreshold]
  );

  // Monitor sensor data for alerts
  const checkAlerts = useCallback(
    (data: SensorData) => {
      const activeAlerts = alerts.filter((alert) => alert.status === "active");

      activeAlerts.forEach((alert) => {
        const value = data[alert.type];
        const isTriggered = checkAlertCondition(alert, value);

        if (isTriggered && alert.status !== "triggered") {
          // Update alert status
          updateAlert(alert.id, {
            status: "triggered",
            lastTriggered: new Date().toISOString(),
          });

          // Show notification
          if (settings.notifications.enabled) {
            // Send email notification (implement this part)
          }

          // Play sound if enabled
          if (settings.notifications.audio) {
            const audio = new Audio("/alert-sound.mp3"); // Add your alert sound file
            audio.play().catch((error) => {
              console.error("Failed to play alert sound:", error);
            });
          }

          // Show toast notification
          toast.error(alert.message, {
            description: `${
              alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
            } alert triggered`,
          });
        } else if (!isTriggered && alert.status === "triggered") {
          // Reset alert status when condition is no longer met
          updateAlert(alert.id, { status: "active" });
        }
      });
    },
    [alerts, updateAlert, settings.notifications, checkAlertCondition]
  );

  return { checkAlerts };
}
