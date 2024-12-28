import { Timestamp } from "firebase/firestore";

export type SensorStatus = "active" | "inactive" | "error";

export interface SensorData {
  id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  distance: number;
  timestamp: Timestamp;
  status: SensorStatus;
}

export interface SensorDataInput extends Omit<SensorData, "id"> {}

export interface SensorStats {
  avgTemperature: number;
  avgHumidity: number;
  avgPressure: number;
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
