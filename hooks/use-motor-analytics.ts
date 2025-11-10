import { useMemo } from "react";
import { SensorData } from "@/types/sensor";
import { calculateVibrationMagnitude } from "@/types/sensor";

/**
 * Calculate RMS from array of sensor data
 */
export function calculateRMS(data: SensorData[]): number {
  if (data.length === 0) return 0;

  const sumSquares = data.reduce((sum, sample) => {
    const magnitude = calculateVibrationMagnitude(
      sample.accX ?? 0,
      sample.accY ?? 0,
      sample.accZ ?? 0
    );
    return sum + magnitude * magnitude;
  }, 0);

  return Math.sqrt(sumSquares / data.length);
}

/**
 * Calculate average vibration magnitude
 */
export function calculateAvgVibration(data: SensorData[]): number {
  if (data.length === 0) return 0;

  const sum = data.reduce((total, sample) => {
    return (
      total +
      calculateVibrationMagnitude(sample.accX ?? 0, sample.accY ?? 0, sample.accZ ?? 0)
    );
  }, 0);

  return sum / data.length;
}

/**
 * Calculate peak vibration
 */
export function calculatePeakVibration(data: SensorData[]): number {
  if (data.length === 0) return 0;

  return Math.max(
    ...data.map((sample) =>
      calculateVibrationMagnitude(sample.accX ?? 0, sample.accY ?? 0, sample.accZ ?? 0)
    )
  );
}

/**
 * Hook for motor status analysis
 */
export function useMotorStatus(currentData?: SensorData) {
  return useMemo(() => {
    if (!currentData) {
      return {
        status: "inactive" as const,
        classification: "idle" as const,
        confidence: 0,
        isHealthy: false,
        vibrationLevel: 0,
      };
    }

    const vibrationLevel = calculateVibrationMagnitude(
      currentData.accX ?? 0,
      currentData.accY ?? 0,
      currentData.accZ ?? 0
    );

    const isHealthy =
      currentData.classification === "nominal" &&
      !(currentData.isAnomaly ?? false) &&
      (currentData.classificationConfidence ?? 0) > 70;

    return {
      status: currentData.status || "inactive",
      classification: currentData.classification || "idle",
      confidence: currentData.classificationConfidence ?? 0,
      isHealthy,
      vibrationLevel,
      hasAnomaly: currentData.isAnomaly ?? false,
      anomalyScore: currentData.anomalyScore ?? 0,
    };
  }, [currentData]);
}

/**
 * Hook for vibration trend analysis
 */
export function useVibrationTrends(data: SensorData[]) {
  return useMemo(() => {
    if (data.length === 0) {
      return {
        current: 0,
        average: 0,
        peak: 0,
        rms: 0,
        trend: "stable" as const,
        changePercent: 0,
      };
    }

    const latestData = data[data.length - 1];
    const current = calculateVibrationMagnitude(
      latestData.accX ?? 0,
      latestData.accY ?? 0,
      latestData.accZ ?? 0
    );

    const average = calculateAvgVibration(data);
    const peak = calculatePeakVibration(data);
    const rms = calculateRMS(data);

    // Determine trend (comparing last 25% vs first 25% of data)
    const quarterLength = Math.max(1, Math.floor(data.length / 4));
    const recentAvg = calculateAvgVibration(data.slice(-quarterLength));
    const oldAvg = calculateAvgVibration(data.slice(0, quarterLength));

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    const change = oldAvg !== 0 ? ((recentAvg - oldAvg) / oldAvg) * 100 : 0;

    if (change > 10) trend = "increasing";
    else if (change < -10) trend = "decreasing";

    return {
      current,
      average,
      peak,
      rms,
      trend,
      changePercent: change,
    };
  }, [data]);
}

/**
 * Hook for anomaly detection analysis
 */
export function useAnomalyDetection(data: SensorData[], threshold: number = 80) {
  return useMemo(() => {
    if (data.length === 0) {
      return {
        currentScore: 0,
        isAnomaly: false,
        anomalyCount: 0,
        anomalyRate: 0,
        recentAnomalies: [],
        consecutiveAnomalies: 0,
        isCritical: false,
      };
    }

    const latestData = data[data.length - 1];
    const anomalyCount = data.filter((d) => d.isAnomaly ?? false).length;
    const anomalyRate = (anomalyCount / data.length) * 100;

    // Get recent anomalies (last 10)
    const recentAnomalies = data
      .filter((d) => d.isAnomaly ?? false)
      .slice(-10)
      .map((d) => ({
        timestamp: d.timestamp,
        score: d.anomalyScore ?? 0,
        classification: d.classification || "unknown",
      }));

    // Count consecutive anomalies from the end
    let consecutiveAnomalies = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].isAnomaly ?? false) {
        consecutiveAnomalies++;
      } else {
        break;
      }
    }

    return {
      currentScore: latestData.anomalyScore ?? 0,
      isAnomaly: latestData.isAnomaly ?? false,
      anomalyCount,
      anomalyRate,
      recentAnomalies,
      consecutiveAnomalies,
      isCritical: consecutiveAnomalies >= 3, // 3+ consecutive anomalies
    };
  }, [data, threshold]);
}

/**
 * Hook for classification distribution
 */
export function useClassificationDistribution(data: SensorData[]) {
  return useMemo(() => {
    if (data.length === 0) {
      return {
        idle: 0,
        nominal: 0,
        idlePercentage: 0,
        nominalPercentage: 0,
      };
    }

    const idle = data.filter((d) => d.classification === "idle").length;
    const nominal = data.filter((d) => d.classification === "nominal").length;

    return {
      idle,
      nominal,
      idlePercentage: (idle / data.length) * 100,
      nominalPercentage: (nominal / data.length) * 100,
    };
  }, [data]);
}

/**
 * Hook for overall motor health score
 * Combines classification confidence, anomaly score, and vibration levels
 */
export function useMotorHealth(data: SensorData[]) {
  // Call hooks at the top level, not inside useMemo
  const vibrationTrend = useVibrationTrends(data);
  const anomalyInfo = useAnomalyDetection(data);

  return useMemo(() => {
    if (data.length === 0) {
      return {
        score: 0,
        status: "unknown" as const,
        factors: {
          classification: 0,
          anomaly: 0,
          vibration: 0,
        },
      };
    }

    const latestData = data[data.length - 1];

    // Health score calculation (0-100)
    // - Classification confidence: 40%
    // - Anomaly score (inverted): 40%
    // - Vibration stability: 20%

    const classificationScore = latestData.classificationConfidence ?? 0;

    // Normalize anomaly score from K-means distance (0-5) to health score (0-100)
    // Lower distance = higher health. Threshold is 1.0
    const rawAnomalyScore = latestData.anomalyScore ?? 0;
    const anomalyScore = Math.max(0, Math.min(100, 100 - (rawAnomalyScore / 5) * 100));

    // Vibration score: lower is better, normalize to 0-100
    const vibrationScore = Math.max(
      0,
      100 - (vibrationTrend.current / 10) * 100
    );

    const healthScore =
      classificationScore * 0.4 + anomalyScore * 0.4 + vibrationScore * 0.2;

    let status: "excellent" | "good" | "fair" | "poor" | "critical" =
      "excellent";
    if (healthScore < 40) status = "critical";
    else if (healthScore < 60) status = "poor";
    else if (healthScore < 75) status = "fair";
    else if (healthScore < 90) status = "good";

    return {
      score: Math.round(healthScore),
      status,
      factors: {
        classification: Math.round(classificationScore),
        anomaly: Math.round(anomalyScore),
        vibration: Math.round(vibrationScore),
      },
      isAnomalyDetected: anomalyInfo.isAnomaly,
      isCritical: anomalyInfo.isCritical,
    };
  }, [data, vibrationTrend, anomalyInfo]);
}

/**
 * Hook for acceleration axis analysis
 */
export function useAccelerationAnalysis(data: SensorData[]) {
  return useMemo(() => {
    if (data.length === 0) {
      return {
        x: { current: 0, avg: 0, peak: 0 },
        y: { current: 0, avg: 0, peak: 0 },
        z: { current: 0, avg: 0, peak: 0 },
        dominantAxis: "z" as const,
      };
    }

    const latest = data[data.length - 1];

    const xValues = data.map((d) => Math.abs(d.accX ?? 0));
    const yValues = data.map((d) => Math.abs(d.accY ?? 0));
    const zValues = data.map((d) => Math.abs(d.accZ ?? 0));

    const x = {
      current: latest.accX ?? 0,
      avg: xValues.reduce((a, b) => a + b, 0) / xValues.length,
      peak: Math.max(...xValues),
    };

    const y = {
      current: latest.accY ?? 0,
      avg: yValues.reduce((a, b) => a + b, 0) / yValues.length,
      peak: Math.max(...yValues),
    };

    const z = {
      current: latest.accZ ?? 0,
      avg: zValues.reduce((a, b) => a + b, 0) / zValues.length,
      peak: Math.max(...zValues),
    };

    // Determine dominant axis based on average
    let dominantAxis: "x" | "y" | "z" = "z";
    const maxAvg = Math.max(x.avg, y.avg, z.avg);
    if (maxAvg === x.avg) dominantAxis = "x";
    else if (maxAvg === y.avg) dominantAxis = "y";

    return { x, y, z, dominantAxis };
  }, [data]);
}
