export const COLLECTIONS = {
  SENSOR_DATA: "sensor_data",
  SENSOR_HISTORY: "sensor_history",
  SENSOR_REALTIME: "sensor_realtime",
} as const;

export const SENSOR_FIELDS = {
  TEMPERATURE: "temperature",
  HUMIDITY: "humidity",
  PRESSURE: "pressure",
  TIMESTAMP: "timestamp",
  DEVICE_ID: "deviceId",
  STATUS: "status",
} as const;

export const SENSOR_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
} as const;

export const QUERY_LIMITS = {
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  HISTORY_LIMIT: 1000,
} as const;
