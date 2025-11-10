/*
 * Configuration file for ESP32 Motor Monitor
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file and rename to: config.h
 * 2. Fill in your WiFi credentials
 * 3. Add your Firebase project details
 * 4. Flash to ESP32
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================
// WiFi Configuration
// ============================================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ============================================================
// Firebase Configuration
// ============================================================
// Find these in Firebase Console > Project Settings
#define FIREBASE_PROJECT_ID "YOUR_PROJECT_ID"  // Example: "motor-health-monitor"
#define FIREBASE_API_KEY "YOUR_WEB_API_KEY"    // Example: "AIzaSyC..."

// ============================================================
// Device Configuration
// ============================================================
#define DEVICE_ID "ESP32_MOTOR_01"  // Unique identifier for this device

// ============================================================
// Sensor Configuration (ADXL345)
// ============================================================
// I2C Pins (ESP32 defaults)
#define I2C_SDA 21
#define I2C_SCL 22

// Sampling configuration (must match Edge Impulse project)
#define SAMPLING_FREQ_HZ 390
#define INFERENCE_WINDOW_MS 2000
#define INFERENCE_STRIDE_MS 500

// Anomaly detection threshold (0-100)
#define ANOMALY_THRESHOLD 80.0

// ============================================================
// Debug Configuration
// ============================================================
#define ENABLE_SERIAL_DEBUG true
#define SERIAL_BAUD_RATE 115200

#endif // CONFIG_H
