import { Timestamp } from "firebase/firestore";

export type SensorStatus = "active" | "inactive" | "error";
export type MotorClassification = "idle" | "nominal";

// Main sensor data interface for motor monitoring
export interface SensorData {
  deviceId: string;
  timestamp: Timestamp;
  status: SensorStatus;

  // Raw acceleration data (m/s² or g-force)
  accX: number;
  accY: number;
  accZ: number;

  // TinyML Classification results
  classification: MotorClassification;
  classificationConfidence: number; // 0-100%

  // K-means Anomaly Detection
  anomalyScore: number; // Raw K-means distance (0-5 typical, threshold: 1.0)
  isAnomaly: boolean;
}

export interface SensorDataInput extends Omit<SensorData, "id"> {}

// Updated stats for motor monitoring
export interface SensorStats {
  avgAnomalyScore: number;
  avgVibrationMagnitude: number; // Calculated from accX, accY, accZ
  totalReadings: number;
  totalAnomalies: number;
  activeDevices: number;
  lastUpdate: Timestamp;

  // Classification distribution
  idleCount: number;
  nominalCount: number;

  // Uptime metrics
  uptimePercentage: number;
}

export interface SensorFilters {
  startDate?: Date;
  endDate?: Date;
  deviceId?: string;
  status?: SensorStatus;
  classification?: MotorClassification;
  anomalyOnly?: boolean;
}

export interface PaginationParams {
  pageSize?: number;
  lastDocumentId?: string;
}

// Constants for error handling
export const SENSOR_ERROR_VALUE = -999;

export function isSensorError(value: number): boolean {
  return value === SENSOR_ERROR_VALUE || isNaN(value);
}

export function getSensorDisplayValue(
  value: number,
  unit: string = "",
  decimals: number = 2
): string {
  if (isSensorError(value)) {
    return "Error";
  }
  return `${value.toFixed(decimals)}${unit}`;
}

// Helper function to determine anomaly status from score
// Note: ESP32 applies threshold of 1.0 on raw score (0-100 scale after × 100)
// The isAnomaly boolean from ESP32 should be used instead of recalculating
export function isAnomalyFromScore(score: number, threshold: number = 1.0): boolean {
  return score >= threshold;
}

// Helper function to calculate vibration magnitude from axes
export function calculateVibrationMagnitude(accX: number, accY: number, accZ: number): number {
  return Math.sqrt(accX * accX + accY * accY + accZ * accZ);
}

// Helper function to get classification color for UI
export function getClassificationColor(classification: MotorClassification): string {
  switch (classification) {
    case "idle":
      return "text-gray-500";
    case "nominal":
      return "text-emerald-500";
    default:
      return "text-gray-400";
  }
}

// Helper function to get status color
export function getStatusColor(status: SensorStatus): string {
  switch (status) {
    case "active":
      return "text-emerald-500";
    case "inactive":
      return "text-yellow-500";
    case "error":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

// Helper function to get anomaly severity
export function getAnomalySeverity(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 50) return "low";
  if (score < 70) return "medium";
  if (score < 90) return "high";
  return "critical";
}

// Helper function to get anomaly color
export function getAnomalyColor(score: number): string {
  const severity = getAnomalySeverity(score);
  switch (severity) {
    case "low":
      return "text-emerald-500";
    case "medium":
      return "text-yellow-500";
    case "high":
      return "text-orange-500";
    case "critical":
      return "text-red-500";
  }
}
