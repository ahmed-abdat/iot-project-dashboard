// ============================================================
// ESP32 + ADXL345 (SPI) + Edge Impulse + Firebase Dashboard
// With I2C LCD Display (16x2)
// ============================================================
// AUTHOR: Ahmed - FSB Tunisia PFE 2025
// PROJECT: TinyML Motor Anomaly Detection with Real-time Dashboard
// HARDWARE: ESP32-WROOM-32, ADXL345 (SPI), LCD 16x2 I2C
// ENHANCED: Firebase Firestore streaming for Next.js dashboard
// ============================================================

// ==================== INCLUDES ====================
#include <motor_anomaly_detection_with_classification_inferencing.h>
#include <SPI.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== WiFi & FIREBASE CONFIG ====================
const char* WIFI_SSID = "ooredoo-6CDFDB-5G";
const char* WIFI_PASSWORD = "9F66F2CFWh-77";

const char* FIREBASE_PROJECT_ID = "iot-project-266e6";
const char* FIREBASE_API_KEY = "AIzaSyCEQGi27Bc4lmjaadcT8PiHFCqSKnlGpYo";
const String DEVICE_ID = "ESP32_MOTOR_01";

// Firebase Firestore REST API endpoints
String firestoreRealtimeUrl;
String firestoreDataUrl;

// ==================== PIN DEFINITIONS ====================
// ADXL345 SPI Pins
#define PIN_CS    5
#define PIN_SCK   18
#define PIN_MISO  19
#define PIN_MOSI  23
#define PIN_INT1  4      // Optional: set to -1 if not connected

// I2C Pins for LCD (default ESP32 I2C)
#define SDA_PIN   21
#define SCL_PIN   22

// ==================== ADXL345 REGISTERS ====================
#define REG_DEVID        0x00
#define REG_BW_RATE      0x2C
#define REG_POWER_CTL    0x2D
#define REG_INT_ENABLE   0x2E
#define REG_INT_MAP      0x2F
#define REG_DATA_FORMAT  0x31
#define REG_DATAX0       0x32

// ==================== SAMPLING CONFIGURATION ====================
static const float    SAMPLE_HZ  = 390.0f;         // Match Edge Impulse frequency
static const uint32_t PERIOD_US  = (uint32_t)(1000000.0f / SAMPLE_HZ);

// ADXL345 Conversion factors
static const float G_PER_LSB = 0.004f;             // Full-res ±16g => 0.004 g/LSB
static const float G_TO_MS2  = 9.80665f;           // Convert g to m/s²

// Optional: 1st-order High-Pass Filter (DC removal)
static const float HPF_ALPHA = 0.0f;               // 0.0 = disabled; 0.98 = light HPF

// Anomaly detection threshold
static const float ANOMALY_THRESHOLD = 1.0f;       // Adjust based on your model

// Firebase upload interval (milliseconds)
static const uint32_t FIREBASE_UPLOAD_INTERVAL = 500; // 2 Hz (every 500ms)

// ==================== LCD INITIALIZATION ====================
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Address 0x27, 16 columns, 2 rows
// Note: If LCD doesn't work, try address 0x3F

// ==================== GLOBAL VARIABLES ====================
static volatile bool g_drdy = false;               // Data ready flag
static float feature_buf[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
static size_t fb_ix = 0;

// HPF state variables (if enabled)
static float hx = 0, hy = 0, hz = 0;
static float px = 0, py = 0, pz = 0;

// Latest sensor readings (for Firebase)
static float latest_accX = 0.0f;
static float latest_accY = 0.0f;
static float latest_accZ = 0.0f;

// Latest inference results (not volatile - String class incompatible with volatile)
static String current_classification = "idle";
static float current_confidence = 0.0f;
static float current_anomaly_score = 0.0f;
static bool current_is_anomaly = false;

// Timing
static unsigned long last_firebase_upload = 0;
static bool wifi_connected = false;

// ==================== LOW-LEVEL SPI FUNCTIONS ====================
/**
 * @brief Read 8-bit register from ADXL345
 */
inline uint8_t adxl_read8(uint8_t reg) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | reg);                        // Read bit + register
  uint8_t v = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
  return v;
}

/**
 * @brief Write 8-bit register to ADXL345
 */
inline void adxl_write8(uint8_t reg, uint8_t val) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(reg);                               // Write (no MSB set)
  SPI.transfer(val);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
}

/**
 * @brief Burst read X/Y/Z axes (6 bytes) from ADXL345
 */
inline void adxl_read_xyz(int16_t &x, int16_t &y, int16_t &z) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | 0x40 | REG_DATAX0);          // Read + multibyte + DATAX0
  uint8_t x0 = SPI.transfer(0x00), x1 = SPI.transfer(0x00);
  uint8_t y0 = SPI.transfer(0x00), y1 = SPI.transfer(0x00);
  uint8_t z0 = SPI.transfer(0x00), z1 = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();

  x = (int16_t)((x1 << 8) | x0);
  y = (int16_t)((y1 << 8) | y0);
  z = (int16_t)((z1 << 8) | z0);
}

// ==================== INTERRUPT SERVICE ROUTINE ====================
/**
 * @brief ISR for ADXL345 data ready interrupt
 */
void IRAM_ATTR isr_data_ready() {
  g_drdy = true;
}

// ==================== EDGE IMPULSE FUNCTIONS ====================
/**
 * @brief Push one sample (3 axes) to feature buffer
 */
inline void push_sample(float ax, float ay, float az) {
  if (fb_ix + 3 <= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
    feature_buf[fb_ix++] = ax;
    feature_buf[fb_ix++] = ay;
    feature_buf[fb_ix++] = az;
  }
}

/**
 * @brief Edge Impulse callback to get data from feature buffer
 */
int ei_get_data(size_t offset, size_t length, float *out_ptr) {
  memcpy(out_ptr, feature_buf + offset, length * sizeof(float));
  return 0;
}

// ==================== WIFI FUNCTIONS ====================
/**
 * @brief Connect to WiFi network
 */
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi connecting");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(attempts % 16, 1);
    lcd.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifi_connected = true;
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi OK");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    wifi_connected = false;
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Continuing without Firebase...");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi FAILED");
    lcd.setCursor(0, 1);
    lcd.print("Local mode only");
    delay(2000);
  }
}

// ==================== FIREBASE FUNCTIONS ====================
/**
 * @brief Send sensor data to Firebase Firestore
 */
void sendToFirebase() {
  if (!wifi_connected || WiFi.status() != WL_CONNECTED) {
    return; // Skip if WiFi not available
  }

  // Create JSON payload for Firestore
  StaticJsonDocument<512> doc;
  JsonObject fields = doc.createNestedObject("fields");

  // Device ID
  fields["deviceId"]["stringValue"] = DEVICE_ID;

  // Timestamp (use server timestamp)
  fields["timestamp"]["timestampValue"] = "REQUEST_TIME";

  // Status
  fields["status"]["stringValue"] = "active";

  // Acceleration data (m/s²)
  fields["accX"]["doubleValue"] = latest_accX;
  fields["accY"]["doubleValue"] = latest_accY;
  fields["accZ"]["doubleValue"] = latest_accZ;

  // Classification results
  fields["classification"]["stringValue"] = current_classification;
  fields["classificationConfidence"]["doubleValue"] = current_confidence;

  // Anomaly detection results
  fields["anomalyScore"]["doubleValue"] = current_anomaly_score;
  fields["isAnomaly"]["booleanValue"] = current_is_anomaly;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send to sensor_realtime (update single document)
  sendToFirestoreDocument(firestoreRealtimeUrl, jsonPayload, true);

  // Send to sensor_data (create new historical document)
  sendToFirestoreDocument(firestoreDataUrl, jsonPayload, false);
}

/**
 * @brief Send HTTP request to Firestore
 */
void sendToFirestoreDocument(String url, String payload, bool isUpdate) {
  HTTPClient http;

  // Add API key to URL
  String fullUrl = url + "?key=" + String(FIREBASE_API_KEY);

  http.begin(fullUrl);
  http.addHeader("Content-Type", "application/json");

  int httpCode;
  if (isUpdate) {
    // PATCH for updating existing document (sensor_realtime)
    httpCode = http.PATCH(payload);
  } else {
    // POST for creating new document (sensor_data)
    httpCode = http.POST(payload);
  }

  if (httpCode > 0) {
    if (httpCode == 200 || httpCode == 201) {
      // Success - don't spam serial
    } else {
      Serial.printf("Firebase error %d: %s\n", httpCode, http.getString().c_str());
    }
  } else {
    Serial.printf("Firebase connection failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==================== LCD HELPER FUNCTIONS ====================
/**
 * @brief Display startup message on LCD
 */
void lcd_show_startup() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Motor Anomaly");
  lcd.setCursor(0, 1);
  lcd.print("Detection v2.0");
  delay(2000);
}

/**
 * @brief Display sensor error on LCD
 */
void lcd_show_sensor_error() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ADXL345 ERROR!");
  lcd.setCursor(0, 1);
  lcd.print("Check wiring");
}

/**
 * @brief Display classification results
 */
void lcd_display_results(ei_impulse_result_t &result) {
  lcd.clear();

  // Check if anomaly score exceeds threshold
  #if EI_CLASSIFIER_HAS_ANOMALY
  if (result.anomaly > ANOMALY_THRESHOLD) {
    // ANOMALY DETECTED - Show warning
    lcd.setCursor(0, 0);
    lcd.print("!!! ANOMALY !!!");
    lcd.setCursor(0, 1);
    lcd.print("Score: ");
    lcd.print(result.anomaly, 2);
  } else {
    // NORMAL OPERATION - Show classification
    lcd.setCursor(0, 0);

    // Find highest classification score
    uint16_t max_idx = 0;
    float max_score = 0.0f;
    for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
      if (result.classification[i].value > max_score) {
        max_score = result.classification[i].value;
        max_idx = i;
      }
    }

    // Display top class
    String label = String(ei_classifier_inferencing_categories[max_idx]);
    if (label.length() > 16) label = label.substring(0, 16);
    lcd.print(label);

    // Display anomaly score on second line
    lcd.setCursor(0, 1);
    lcd.print("Anom: ");
    lcd.print(result.anomaly, 3);

    // WiFi indicator
    if (wifi_connected && WiFi.status() == WL_CONNECTED) {
      lcd.print(" FB");
    } else {
      lcd.print(" --");
    }
  }
  #else
  // If no anomaly detection in model, just show classification
  lcd.setCursor(0, 0);
  lcd.print("Class: ");

  // Find highest score
  uint16_t max_idx = 0;
  float max_score = 0.0f;
  for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    if (result.classification[i].value > max_score) {
      max_score = result.classification[i].value;
      max_idx = i;
    }
  }

  lcd.print(ei_classifier_inferencing_categories[max_idx]);
  lcd.setCursor(0, 1);
  lcd.print("Score: ");
  lcd.print(max_score, 3);
  #endif
}

// ==================== SETUP ====================
void setup() {
  // Initialize Serial
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== Motor Anomaly Detection + Firebase Dashboard ===");
  Serial.println("ESP32 + ADXL345 + Edge Impulse + Firebase");
  Serial.println("====================================================\n");

  // Initialize I2C for LCD
  Wire.begin(SDA_PIN, SCL_PIN);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd_show_startup();

  // Initialize SPI pins
  pinMode(PIN_CS, OUTPUT);
  digitalWrite(PIN_CS, HIGH);
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_CS);

  // Verify ADXL345 connection
  Serial.print("Checking ADXL345... ");
  uint8_t devid = adxl_read8(REG_DEVID);
  if (devid != 0xE5) {
    Serial.println("FAILED!");
    Serial.printf("Device ID: 0x%02X (expected 0xE5)\n", devid);
    lcd_show_sensor_error();
    while (true) { delay(1000); }
  }
  Serial.println("OK!");

  // Configure ADXL345
  Serial.println("Configuring ADXL345...");
  adxl_write8(REG_POWER_CTL, 0x00);                // Standby mode
  adxl_write8(REG_DATA_FORMAT, 0x0B);              // Full-res, ±16g
  adxl_write8(REG_BW_RATE, 0x0E);                  // 400 Hz ODR

  // Setup interrupt if connected
  if (PIN_INT1 >= 0) {
    adxl_write8(REG_INT_MAP, 0x00);                // Route DATA_READY to INT1
    adxl_write8(REG_INT_ENABLE, 0x80);             // Enable DATA_READY interrupt
    pinMode(PIN_INT1, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIN_INT1), isr_data_ready, RISING);
    Serial.println("Interrupt enabled on pin 4");
  }

  adxl_write8(REG_POWER_CTL, 0x08);                // Measurement mode

  // Connect to WiFi
  connectWiFi();

  // Initialize Firebase URLs (even if WiFi failed, in case it reconnects)
  firestoreRealtimeUrl = "https://firestore.googleapis.com/v1/projects/" +
                         String(FIREBASE_PROJECT_ID) +
                         "/databases/(default)/documents/sensor_realtime/" + DEVICE_ID;

  firestoreDataUrl = "https://firestore.googleapis.com/v1/projects/" +
                     String(FIREBASE_PROJECT_ID) +
                     "/databases/(default)/documents/sensor_data";

  // Display ready message
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready: Sampling");
  lcd.setCursor(0, 1);
  lcd.print("@ 390 Hz");

  Serial.println("System ready!");
  Serial.printf("Sampling rate: %.1f Hz\n", SAMPLE_HZ);
  Serial.printf("Window size: %d samples\n", EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / 3);
  Serial.printf("HPF Alpha: %.2f (0=off)\n", HPF_ALPHA);
  Serial.printf("Firebase upload: every %d ms\n\n", FIREBASE_UPLOAD_INTERVAL);

  delay(1000);
}

// ==================== MAIN LOOP ====================
void loop() {
  uint32_t t0 = micros();

  // Wait for data ready if interrupt enabled
  if (PIN_INT1 >= 0) {
    uint32_t guard = micros();
    while (!g_drdy && (micros() - guard) < 3000) {
      // Timeout after 3ms to prevent hang
    }
    g_drdy = false;
  }

  // Read ADXL345 raw values
  int16_t rx, ry, rz;
  adxl_read_xyz(rx, ry, rz);

  // Convert to m/s²
  float ax = rx * G_PER_LSB * G_TO_MS2;
  float ay = ry * G_PER_LSB * G_TO_MS2;
  float az = rz * G_PER_LSB * G_TO_MS2;

  // Store latest readings for Firebase
  latest_accX = ax;
  latest_accY = ay;
  latest_accZ = az;

  // Apply optional high-pass filter (DC removal)
  if (HPF_ALPHA > 0.0f && HPF_ALPHA < 1.0f) {
    hx = HPF_ALPHA * (hx + ax - px); px = ax; ax = hx;
    hy = HPF_ALPHA * (hy + ay - py); py = ay; ay = hy;
    hz = HPF_ALPHA * (hz + az - pz); pz = az; az = hz;
  }

  // Push sample to feature buffer
  push_sample(ax, ay, az);

  // Run inference when buffer is full
  if (fb_ix >= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
    Serial.println("Running inference...");

    // Prepare signal structure
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = &ei_get_data;

    // Run classifier
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);

    if (err == EI_IMPULSE_OK) {
      // Print results to Serial
      Serial.println("--- Inference Results ---");
      Serial.printf("DSP: %d ms, Classification: %d ms, Anomaly: %d ms\n",
                    result.timing.dsp,
                    result.timing.classification,
                    result.timing.anomaly);

      Serial.println("Classifications:");
      float max_confidence = 0.0f;
      String predicted_label = "unknown";

      for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        Serial.printf("  %s: %.5f\n",
                     ei_classifier_inferencing_categories[i],
                     result.classification[i].value);

        if (result.classification[i].value > max_confidence) {
          max_confidence = result.classification[i].value;
          predicted_label = ei_classifier_inferencing_categories[i];
        }
      }

      // Store results for Firebase
      current_classification = predicted_label;
      current_confidence = max_confidence * 100.0f; // Convert to percentage

      #if EI_CLASSIFIER_HAS_ANOMALY
      current_anomaly_score = result.anomaly * 100.0f; // Convert to 0-100 scale
      current_is_anomaly = (result.anomaly > ANOMALY_THRESHOLD);

      Serial.printf("Anomaly Score: %.5f", result.anomaly);
      if (current_is_anomaly) {
        Serial.println(" ⚠️ ANOMALY DETECTED!");
      } else {
        Serial.println(" ✓ Normal");
      }
      #endif
      Serial.println("------------------------\n");

      // Update LCD display
      lcd_display_results(result);

    } else {
      Serial.printf("Inference ERROR: %d\n", (int)err);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Inference Error");
      lcd.setCursor(0, 1);
      lcd.print("Code: ");
      lcd.print((int)err);
    }

    // Reset buffer for next window
    fb_ix = 0;
  }

  // Upload to Firebase at regular intervals (500ms)
  if (millis() - last_firebase_upload >= FIREBASE_UPLOAD_INTERVAL) {
    last_firebase_upload = millis();
    sendToFirebase();
  }

  // Maintain consistent sampling rate
  uint32_t spent = micros() - t0;
  if (spent < PERIOD_US) {
    delayMicroseconds(PERIOD_US - spent);
  }
}
