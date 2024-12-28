"use client";

import { useEffect, useRef } from "react";
import { useAlertStore } from "@/lib/stores/alert-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { toast } from "sonner";
import { useSensorData } from "@/hooks/use-sensor-data";

export function AlertMonitor() {
  const { data: realtimeSensors } = useSensorData();
  const alertStore = useAlertStore();
  const settings = useSettingsStore((state) => state.settings);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckedRef = useRef<Record<string, number>>({});

  // Initialize audio on client side
  useEffect(() => {
    audioRef.current = new Audio("/sounds/alert.mp3");
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check alerts when sensor data changes
  useEffect(() => {
    if (!realtimeSensors?.[0]) return;

    const currentData = {
      temperature: realtimeSensors[0].temperature,
      humidity: realtimeSensors[0].humidity,
      pressure: realtimeSensors[0].pressure,
      distance: realtimeSensors[0].distance,
      timestamp: realtimeSensors[0].timestamp.toDate(),
    };

    const activeAlerts = alertStore.alerts.filter(
      (alert) => alert.status === "active"
    );

    activeAlerts.forEach((alert) => {
      const value = currentData[alert.type];
      let isTriggered = false;

      switch (alert.operator) {
        case "above":
          isTriggered = value > alert.threshold;
          break;
        case "below":
          isTriggered = value < alert.threshold;
          break;
        case "between":
          isTriggered =
            value > alert.threshold &&
            alert.thresholdHigh !== undefined &&
            value < alert.thresholdHigh;
          break;
      }

      // Check if the value has changed significantly since last check
      const lastValue = lastCheckedRef.current[alert.id];
      const hasSignificantChange =
        !lastValue || Math.abs(value - lastValue) > 0.1;

      if (isTriggered) {
        // Only notify if not already triggered or if there's a significant change
        if (alert.status !== "triggered" || hasSignificantChange) {
          // Update alert status
          alertStore.updateAlert(alert.id, {
            status: "triggered",
            lastTriggered: new Date().toISOString(),
          });

          // Play alert sound if enabled
          if (settings.notifications.audio && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
              // Ignore autoplay errors
            });
          }

          // Show toast notification with priority-based styling
          const toastFn =
            alert.priority === "high"
              ? toast.error
              : alert.priority === "medium"
              ? toast.warning
              : toast.info;

          toastFn(alert.message, {
            description: `${
              alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
            }: ${value.toFixed(1)}${
              alert.type === "temperature"
                ? "°C"
                : alert.type === "humidity"
                ? "%"
                : alert.type === "distance"
                ? "cm"
                : "hPa"
            }`,
            duration: alert.priority === "high" ? 8000 : 5000,
            icon: alert.priority === "high" ? "🚨" : "⚠️",
          });
        }
      } else if (alert.status === "triggered") {
        // Reset alert status when condition is no longer met
        alertStore.updateAlert(alert.id, {
          status: "active",
        });

        // Show recovery notification
        toast.success(`Alert recovered: ${alert.message}`, {
          description: `${
            alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
          } is now within normal range`,
          duration: 3000,
        });
      }

      // Update last checked value
      lastCheckedRef.current[alert.id] = value;
    });
  }, [realtimeSensors, alertStore, settings.notifications.audio]);

  return null;
}
