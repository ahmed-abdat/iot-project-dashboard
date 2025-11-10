// ESP32 Motor Anomaly Detection v2.2 - Optimized
// Ahmed Abdat - FSB Tunisia PFE 2025

#include <motor_anomaly_detection_with_classification_inferencing.h>
#include <SPI.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include <time.h>

// Configuration
#define DEBUG_MODE              true
#define DEBUG_SERIAL_BAUD       115200
#define WDT_TIMEOUT             30

// Sampling
#define SAMPLE_RATE_HZ          390.0f
#define SAMPLE_PERIOD_US        ((uint32_t)(1000000.0f / SAMPLE_RATE_HZ))

// Firebase
#define FIREBASE_UPLOAD_RATE_MS 5000  // 5 seconds for testing/development
#define FIREBASE_ANOMALY_UPLOAD true

// WiFi
#define WIFI_CONNECT_TIMEOUT_S  15
#define WIFI_ENABLED            true
#define WIFI_RECONNECT_INTERVAL 30000

// NTP Time
#define NTP_SERVER              "pool.ntp.org"
#define GMT_OFFSET_SEC          3600    // UTC+1 for Tunisia
#define DAYLIGHT_OFFSET_SEC     0

// ADXL345
#define ADXL345_DEVID           0xE5
#define ADXL345_ODR_400HZ       0x0C  // FIXED: 0x0C = 400Hz (was 0x0E = 1600Hz)
#define ADXL345_RANGE_16G       0x0B

// LCD
#define LCD_I2C_ADDR            0x27
#define LCD_COLS                16
#define LCD_ROWS                2

// Anomaly
#define ANOMALY_THRESHOLD       1.0f

// Credentials
const char* WIFI_SSID        = "Esp32";
const char* WIFI_PASSWORD    = "42049073";
const char* FIREBASE_PROJECT = "iot-project-266e6";
const char* FIREBASE_API_KEY = "AIzaSyCEQGi27Bc4lmjaadcT8PiHFCqSKnlGpYo";
const String DEVICE_ID       = "ESP32_MOTOR_01";

String firestoreRealtimeUrl;
String firestoreDataUrl;

// Pinout
#define PIN_CS      5
#define PIN_SCK     18
#define PIN_MISO    19
#define PIN_MOSI    23
#define PIN_SDA     21
#define PIN_SCL     22

// ADXL345 Registers
#define REG_DEVID         0x00
#define REG_BW_RATE       0x2C
#define REG_POWER_CTL     0x2D
#define REG_DATA_FORMAT   0x31
#define REG_DATAX0        0x32

// Constants
static const float G_PER_LSB = 0.004f;
static const float G_TO_MS2  = 9.80665f;

// Objects
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);
HTTPClient http;

// Variables
static float feature_buf[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
static size_t fb_ix = 0;

static volatile float latest_accX = 0.0f;
static volatile float latest_accY = 0.0f;
static volatile float latest_accZ = 0.0f;

static String current_classification = "idle";
static float current_confidence = 0.0f;
static float current_anomaly_score = 0.0f;
static bool current_is_anomaly = false;
static bool previous_anomaly_state = false;

static bool wifi_connected = false;
static bool lcd_available = false;

static unsigned long last_firebase_upload = 0;
static unsigned long last_wifi_check = 0;
static unsigned long upload_count = 0;

// Debug macros
#if DEBUG_MODE
  #define DEBUG_PRINT(x)    Serial.print(x)
  #define DEBUG_PRINTLN(x)  Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

// ADXL345 SPI functions
inline uint8_t adxl_read8(uint8_t reg) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | reg);
  uint8_t value = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
  return value;
}

inline void adxl_write8(uint8_t reg, uint8_t val) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(reg);
  SPI.transfer(val);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
}

inline void adxl_read_xyz(int16_t &x, int16_t &y, int16_t &z) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | 0x40 | REG_DATAX0);
  uint8_t x0 = SPI.transfer(0x00);
  uint8_t x1 = SPI.transfer(0x00);
  uint8_t y0 = SPI.transfer(0x00);
  uint8_t y1 = SPI.transfer(0x00);
  uint8_t z0 = SPI.transfer(0x00);
  uint8_t z1 = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();

  x = (int16_t)((x1 << 8) | x0);
  y = (int16_t)((y1 << 8) | y0);
  z = (int16_t)((z1 << 8) | z0);
}

bool adxl_init() {
  uint8_t devid = adxl_read8(REG_DEVID);
  if (devid != ADXL345_DEVID) {
    DEBUG_PRINTF("ADXL345 error: ID=0x%02X\n", devid);
    return false;
  }

  adxl_write8(REG_POWER_CTL, 0x00);
  delay(10);
  adxl_write8(REG_DATA_FORMAT, ADXL345_RANGE_16G);
  adxl_write8(REG_BW_RATE, ADXL345_ODR_400HZ);
  adxl_write8(REG_POWER_CTL, 0x08);
  delay(10);

  DEBUG_PRINTLN("ADXL345 OK");
  return true;
}

// Edge Impulse functions
inline void push_sample(float ax, float ay, float az) {
  if (fb_ix + 3 <= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
    feature_buf[fb_ix++] = ax;
    feature_buf[fb_ix++] = ay;
    feature_buf[fb_ix++] = az;
  }
}

int ei_get_data(size_t offset, size_t length, float *out_ptr) {
  memcpy(out_ptr, feature_buf + offset, length * sizeof(float));
  return 0;
}

// WiFi
bool connectWiFi() {
  if (!WIFI_ENABLED) {
    DEBUG_PRINTLN("WiFi: Disabled (offline mode)");
    wifi_connected = false;
    return false;
  }

  DEBUG_PRINTF("WiFi: %s ", WIFI_SSID);

  if (lcd_available) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi...");
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Quick connection attempt - don't block
  uint8_t attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < WIFI_CONNECT_TIMEOUT_S * 2) {
    delay(500);
    DEBUG_PRINT(".");
    attempt++;
    esp_task_wdt_reset();
  }

  wifi_connected = (WiFi.status() == WL_CONNECTED);

  if (wifi_connected) {
    DEBUG_PRINTF("OK (%s)\n", WiFi.localIP().toString().c_str());

    // Configure NTP time sync
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    DEBUG_PRINTLN("NTP: Syncing time...");

    // Wait for time to be set (up to 10 seconds)
    int ntp_retry = 0;
    while (time(nullptr) < 100000 && ntp_retry < 20) {
      delay(500);
      DEBUG_PRINT(".");
      ntp_retry++;
    }
    DEBUG_PRINTLN(time(nullptr) > 100000 ? " OK" : " FAIL");

    if (lcd_available) {
      lcd.clear();
      lcd.print("WiFi OK");
      delay(1000);
    }
  } else {
    DEBUG_PRINTLN("FAIL (continuing offline)");
    if (lcd_available) {
      lcd.clear();
      lcd.print("Offline Mode");
      delay(1000);
    }
  }

  return wifi_connected;
}

void checkWiFiStatus() {
  if (!WIFI_ENABLED) return;

  unsigned long now = millis();
  if (now - last_wifi_check < WIFI_RECONNECT_INTERVAL) return;

  last_wifi_check = now;

  // Quick status check
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifi_connected) {
      wifi_connected = true;
      DEBUG_PRINTLN("WiFi: Reconnected!");
    }
  } else {
    if (wifi_connected) {
      wifi_connected = false;
      DEBUG_PRINTLN("WiFi: Lost connection");
    }

    // Try quick reconnect (non-blocking - only 3 attempts)
    DEBUG_PRINT("WiFi: Reconnecting...");
    WiFi.reconnect();

    for (uint8_t i = 0; i < 3; i++) {
      delay(1000);
      if (WiFi.status() == WL_CONNECTED) {
        wifi_connected = true;
        DEBUG_PRINTF(" OK (%s)\n", WiFi.localIP().toString().c_str());
        return;
      }
      DEBUG_PRINT(".");
    }
    DEBUG_PRINTLN(" failed (will retry later)");
  }
}

// Get ISO 8601 timestamp for Firebase
String getISOTimestamp() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return ""; // Return empty if time not synced
  }

  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buffer) + "Z"; // Add 'Z' for UTC
}

// Firebase
void sendToFirebase() {
  if (!wifi_connected) return;

  StaticJsonDocument<512> doc;
  JsonObject fields = doc.createNestedObject("fields");

  fields["deviceId"]["stringValue"] = DEVICE_ID;

  // Use proper ISO 8601 timestamp
  String isoTimestamp = getISOTimestamp();
  if (isoTimestamp.length() > 0) {
    fields["timestamp"]["timestampValue"] = isoTimestamp;
  } else {
    // Fallback to millis if NTP not synced
    fields["timestamp"]["integerValue"] = String(millis());
  }
  fields["accX"]["doubleValue"] = latest_accX;
  fields["accY"]["doubleValue"] = latest_accY;
  fields["accZ"]["doubleValue"] = latest_accZ;
  fields["classification"]["stringValue"] = current_classification;
  fields["classificationConfidence"]["doubleValue"] = current_confidence;
  // Note: anomalyScore is raw K-means distance (0.0-3.0 typical), not percentage
  fields["anomalyScore"]["doubleValue"] = current_anomaly_score;
  fields["isAnomaly"]["booleanValue"] = current_is_anomaly;
  fields["status"]["stringValue"] = "active";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // 1. Upload to realtime endpoint (PATCH - overwrites current state)
  String url = firestoreRealtimeUrl + "?key=" + String(FIREBASE_API_KEY);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.PATCH(jsonPayload);
  http.end();

  bool realtime_ok = (code == 200);

  // 2. Upload to historical data collection (POST - creates new document)
  String dataUrl = firestoreDataUrl + "?key=" + String(FIREBASE_API_KEY);
  http.begin(dataUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int dataCode = http.POST(jsonPayload);
  http.end();

  bool historical_ok = (dataCode == 200);

  if (realtime_ok && historical_ok) {
    upload_count++;
    DEBUG_PRINTF("Firebase OK (#%lu)\n", upload_count);
  } else {
    DEBUG_PRINTF("Firebase FAIL (realtime:%d, history:%d)\n", code, dataCode);
  }
}

// Lcd
uint8_t scanI2C() {
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      DEBUG_PRINTF("I2C: 0x%02X\n", addr);
      return addr;
    }
  }
  DEBUG_PRINTLN("I2C: None");
  return 0;
}

void lcd_update(const char* line1, const char* line2) {
  if (!lcd_available) return;
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  if (line2) {
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }
}

// Setup
void setup() {
  Serial.begin(DEBUG_SERIAL_BAUD);
  delay(500);

  DEBUG_PRINTLN("\n=== ESP32 Motor Anomaly Detection ===");
  DEBUG_PRINTLN("Version 2.2 - Optimized");
  DEBUG_PRINTLN("FSB Tunisia - Ahmed Abdat\n");

  // Watchdog
  esp_task_wdt_deinit();
  delay(10);
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = WDT_TIMEOUT * 1000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);
  DEBUG_PRINTLN("Watchdog OK");

  // I2C & LCD
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000);
  uint8_t lcd_addr = scanI2C();

  if (lcd_addr != 0) {
    lcd.init();
    lcd.backlight();
    lcd_available = true;
    lcd_update("Motor Anomaly", "Detection v2.2");
    delay(2000);
    DEBUG_PRINTLN("LCD OK");
  }

  // SPI & ADXL345
  pinMode(PIN_CS, OUTPUT);
  digitalWrite(PIN_CS, HIGH);
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_CS);

  if (!adxl_init()) {
    DEBUG_PRINTLN("ADXL345 FAIL - STOP");
    lcd_update("ADXL345 ERROR", "Check wiring");
    while (true) {
      esp_task_wdt_reset();
      delay(1000);
    }
  }

  // WiFi
  connectWiFi();

  // Firebase URLs
  firestoreRealtimeUrl = "https://firestore.googleapis.com/v1/projects/" +
                         String(FIREBASE_PROJECT) +
                         "/databases/(default)/documents/sensor_realtime/" + DEVICE_ID;

  firestoreDataUrl = "https://firestore.googleapis.com/v1/projects/" +
                     String(FIREBASE_PROJECT) +
                     "/databases/(default)/documents/sensor_data";

  DEBUG_PRINTLN("\n=== System Ready ===");
  DEBUG_PRINTF("Sample rate: %.0f Hz\n", SAMPLE_RATE_HZ);
  DEBUG_PRINTF("Upload interval: %lu sec\n", FIREBASE_UPLOAD_RATE_MS / 1000);
  DEBUG_PRINTF("Free RAM: %d bytes\n\n", ESP.getFreeHeap());

  lcd_update("Ready: 390 Hz", "Sampling...");

  esp_task_wdt_reset();
}

// Loop
void loop() {
  esp_task_wdt_reset();

  // Read ADXL345
  int16_t raw_x, raw_y, raw_z;
  adxl_read_xyz(raw_x, raw_y, raw_z);

  float ax = raw_x * G_PER_LSB * G_TO_MS2;
  float ay = raw_y * G_PER_LSB * G_TO_MS2;
  float az = raw_z * G_PER_LSB * G_TO_MS2;

  latest_accX = ax;
  latest_accY = ay;
  latest_accZ = az;

  push_sample(ax, ay, az);

  if (fb_ix >= EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = &ei_get_data;

    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);

    if (err == EI_IMPULSE_OK) {
      float max_confidence = 0.0f;
      String predicted_label = "unknown";

      for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        if (result.classification[i].value > max_confidence) {
          max_confidence = result.classification[i].value;
          predicted_label = ei_classifier_inferencing_categories[i];
        }
      }

      current_classification = predicted_label;
      current_confidence = max_confidence * 100.0f;

      #if EI_CLASSIFIER_HAS_ANOMALY
      // Keep raw anomaly distance (not percentage!), clamp negatives to 0
      current_anomaly_score = max(0.0f, result.anomaly);
      current_is_anomaly = (result.anomaly > ANOMALY_THRESHOLD);

      DEBUG_PRINTF("%s %.0f%% | A:%.3f%s\n",
                   predicted_label.c_str(),
                   current_confidence,
                   current_anomaly_score,
                   current_is_anomaly ? " [!]" : "");

      if (lcd_available) {
        char line1[17], line2[17];
        if (current_is_anomaly) {
          // Show warning when anomaly detected
          snprintf(line1, 17, "!!! ANOMALY !!!");
          snprintf(line2, 17, "Score: %.3f", current_anomaly_score);
        } else {
          // Show classification + anomaly score
          snprintf(line1, 17, "%s %.0f%%", predicted_label.c_str(), current_confidence);
          snprintf(line2, 17, "A:%.3f OK", current_anomaly_score);
        }
        lcd_update(line1, line2);
      }
      #else
      DEBUG_PRINTF("%s %.0f%%\n", predicted_label.c_str(), current_confidence);
      #endif

      unsigned long now = millis();
      bool anomaly_detected = (current_is_anomaly && !previous_anomaly_state);
      bool time_for_upload = (now - last_firebase_upload >= FIREBASE_UPLOAD_RATE_MS);

      if (anomaly_detected && FIREBASE_ANOMALY_UPLOAD) {
        last_firebase_upload = now;
        sendToFirebase();
        DEBUG_PRINTLN("ANOMALY -> Upload!");
      } else if (time_for_upload) {
        last_firebase_upload = now;
        sendToFirebase();
      }

      previous_anomaly_state = current_is_anomaly;
      checkWiFiStatus();
    }

    fb_ix = 0;
  }

  delayMicroseconds(SAMPLE_PERIOD_US);
}
