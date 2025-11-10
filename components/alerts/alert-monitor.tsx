"use client";

import { useEffect, useRef } from "react";
import { useAlertStore } from "@/lib/stores/alert-store";
import { toast } from "sonner";
import { useSensorData } from "@/hooks/use-sensor-data";
import { calculateVibrationMagnitude } from "@/types/sensor";

export function AlertMonitor() {
  const { data: realtimeSensors } = useSensorData();
  const alertStore = useAlertStore();
  const lastCheckedRef = useRef<Record<string, number>>({});
  const motorData = realtimeSensors?.[0];

  // Check alerts when sensor data changes
  useEffect(() => {
    if (!motorData) return;

    // Calculate motor metrics
    const vibrationMagnitude = calculateVibrationMagnitude(
      motorData.accX,
      motorData.accY,
      motorData.accZ
    );

    // Calculate simple health score for alerts
    const classificationScore = motorData.classificationConfidence;

    // Normalize anomaly score from K-means distance (0-5) to health score (0-100)
    const rawAnomalyScore = motorData.anomalyScore;
    const anomalyScore = Math.max(0, Math.min(100, 100 - (rawAnomalyScore / 5) * 100));

    const vibrationScore = Math.max(0, 100 - (vibrationMagnitude / 10) * 100);
    const motorHealth = Math.round(
      classificationScore * 0.4 + anomalyScore * 0.4 + vibrationScore * 0.2
    );

    // Handle timestamp conversion safely
    let timestamp: Date;
    if (motorData.timestamp && typeof motorData.timestamp.toDate === 'function') {
      timestamp = motorData.timestamp.toDate();
    } else if (motorData.timestamp instanceof Date) {
      timestamp = motorData.timestamp;
    } else {
      timestamp = new Date();
    }

    const currentData = {
      anomalyScore: motorData.anomalyScore,
      vibrationMagnitude,
      classificationConfidence: motorData.classificationConfidence,
      motorHealth,
      timestamp,
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

          // Show toast notification with priority-based styling
          const toastFn =
            alert.priority === "high"
              ? toast.error
              : alert.priority === "medium"
              ? toast.warning
              : toast.info;

          const getUnit = (type: string) => {
            switch (type) {
              case "vibrationMagnitude":
                return " m/s²";
              case "classificationConfidence":
                return "%";
              default:
                return "";
            }
          };

          toastFn(alert.message, {
            description: `${
              alert.type.charAt(0).toUpperCase() + alert.type.slice(1)
            }: ${value.toFixed(1)}${getUnit(alert.type)}`,
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
  }, [motorData, alertStore]);

  return null;
}
