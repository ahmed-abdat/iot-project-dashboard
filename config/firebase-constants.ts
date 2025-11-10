export const COLLECTIONS = {
  SENSOR_DATA: "sensor_data",
  SENSOR_HISTORY: "sensor_history",
  SENSOR_REALTIME: "sensor_realtime",
} as const;

export const SENSOR_FIELDS = {
  // Identifiers
  DEVICE_ID: "deviceId",
  TIMESTAMP: "timestamp",
  STATUS: "status",

  // Acceleration data (raw from ADXL345)
  ACC_X: "accX",
  ACC_Y: "accY",
  ACC_Z: "accZ",

  // Classification (from Neural Network)
  CLASSIFICATION: "classification",
  CLASSIFICATION_CONFIDENCE: "classificationConfidence",

  // Anomaly detection (from K-means)
  ANOMALY_SCORE: "anomalyScore",
  IS_ANOMALY: "isAnomaly",
} as const;

export const SENSOR_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ERROR: "error",
} as const;

export const MOTOR_CLASSIFICATION = {
  IDLE: "idle",
  NOMINAL: "nominal",
} as const;

export const QUERY_LIMITS = {
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  HISTORY_LIMIT: 1000,
  REALTIME_LIMIT: 50, // Limit for real-time data display
} as const;

// Anomaly detection thresholds
export const ANOMALY_THRESHOLDS = {
  LOW: 50,
  MEDIUM: 70,
  HIGH: 90,
  DEFAULT: 80, // Default threshold for triggering alerts
} as const;

// Sampling configuration (from Edge Impulse)
export const SAMPLING_CONFIG = {
  FREQUENCY_HZ: 390, // ADXL345 sampling rate
  WINDOW_MS: 2000, // 2-second window
  STRIDE_MS: 500, // 500ms stride (75% overlap)
  SAMPLES_PER_WINDOW: 780, // 390 Hz × 2s
  PREDICTIONS_PER_SECOND: 2, // 1 prediction every 500ms
} as const;

// Vibration alert thresholds
export const VIBRATION_THRESHOLDS = {
  RMS_WARNING: 2.0,
  RMS_CRITICAL: 4.0,
  MAGNITUDE_WARNING: 3.0,
  MAGNITUDE_CRITICAL: 6.0,
} as const;
