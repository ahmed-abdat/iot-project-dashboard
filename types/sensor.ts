import { Timestamp } from "firebase/firestore";

export type SensorStatus = "active" | "inactive" | "error";

export interface SensorData {
  deviceId: string;
  distance: number;
  gasLevel: number;
  humidity: number;
  status: SensorStatus;
  temperature: number;
  timestamp: Timestamp;
}

export interface SensorDataInput extends Omit<SensorData, "id"> {}

export interface SensorStats {
  avgTemperature: number;
  avgHumidity: number;
  avgDistance: number;
  totalReadings: number;
  activeDevices: number;
  lastUpdate: Timestamp;
}

export interface SensorFilters {
  startDate?: Date;
  endDate?: Date;
  deviceId?: string;
  status?: SensorStatus;
}

export interface PaginationParams {
  pageSize?: number;
  lastDocumentId?: string;
}

export const SENSOR_ERROR_VALUE = -1;

export function isSensorError(value: number): boolean {
  return value === SENSOR_ERROR_VALUE;
}

export function getSensorDisplayValue(
  value: number,
  unit: string = ""
): string {
  if (isSensorError(value)) {
    return "Error";
  }
  return `${value}${unit}`;
}
