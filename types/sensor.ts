import { Timestamp } from "firebase/firestore";

export type SensorStatus = "active" | "inactive" | "error";

export type ReadingQuality = "good" | "warning" | "error";

export interface SensorData {
  id: string;
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp: Timestamp;
  status: SensorStatus;
  readingQuality: {
    temperature: ReadingQuality;
    humidity: ReadingQuality;
    pressure: ReadingQuality;
  };
}

export interface SensorDataInput extends Omit<SensorData, "id"> {}

export interface SensorStats {
  avgTemperature: number;
  avgHumidity: number;
  avgPressure: number;
  totalReadings: number;
  activeDevices: number;
  lastUpdate: Timestamp;
  readingQuality: {
    good: number;
    warning: number;
    error: number;
  };
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
