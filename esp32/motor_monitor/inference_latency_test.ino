// ============================================================
// ESP32 Edge Impulse Inference Latency Test
// ============================================================
// PURPOSE: Measure actual inference latency on MCU and compare
//          with Edge Impulse platform reported values
// AUTHOR: Ahmed - FSB Tunisia PFE 2025
// HARDWARE: ESP32-WROOM-32, ADXL345
// ============================================================

#include <motor_anomaly_detection_with_classification_inferencing.h>
#include <SPI.h>

// ==================== PIN DEFINITIONS ====================
#define PIN_CS    5
#define PIN_SCK   18
#define PIN_MISO  19
#define PIN_MOSI  23

// ==================== ADXL345 REGISTERS ====================
#define REG_DEVID        0x00
#define REG_BW_RATE      0x2C
#define REG_POWER_CTL    0x2D
#define REG_DATA_FORMAT  0x31
#define REG_DATAX0       0x32

// ==================== SAMPLING CONFIGURATION ====================
static const float    SAMPLE_HZ  = 374.0f;         // Match Edge Impulse frequency
static const uint32_t PERIOD_US  = (uint32_t)(1000000.0f / SAMPLE_HZ);

// ADXL345 Conversion factors
static const float G_PER_LSB = 0.004f;             // Full-res ±16g => 0.004 g/LSB
static const float G_TO_MS2  = 9.80665f;           // Convert g to m/s²

// Anomaly detection threshold
static const float ANOMALY_THRESHOLD = 1.0f;

// ==================== LATENCY MEASUREMENT ====================
#define NUM_INFERENCE_TESTS 10                     // Number of tests to average

struct LatencyStats {
  uint32_t dsp_min;
  uint32_t dsp_max;
  uint32_t dsp_avg;
  uint32_t classification_min;
  uint32_t classification_max;
  uint32_t classification_avg;
  uint32_t anomaly_min;
  uint32_t anomaly_max;
  uint32_t anomaly_avg;
  uint32_t total_min;
  uint32_t total_max;
  uint32_t total_avg;
};

// ==================== GLOBAL VARIABLES ====================
static float feature_buf[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];
static size_t fb_ix = 0;

// ==================== LOW-LEVEL SPI FUNCTIONS ====================
inline uint8_t adxl_read8(uint8_t reg) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | reg);
  uint8_t v = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
  return v;
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
  uint8_t x0 = SPI.transfer(0x00), x1 = SPI.transfer(0x00);
  uint8_t y0 = SPI.transfer(0x00), y1 = SPI.transfer(0x00);
  uint8_t z0 = SPI.transfer(0x00), z1 = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();

  x = (int16_t)((x1 << 8) | x0);
  y = (int16_t)((y1 << 8) | y0);
  z = (int16_t)((z1 << 8) | z0);
}

// ==================== EDGE IMPULSE FUNCTIONS ====================
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

// ==================== LATENCY MEASUREMENT ====================
void measureInferenceLatency(LatencyStats &stats) {
  Serial.println("\n╔════════════════════════════════════════════════════════╗");
  Serial.println("║      INFERENCE LATENCY MEASUREMENT TEST               ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");

  uint32_t dsp_sum = 0, class_sum = 0, anom_sum = 0, total_sum = 0;
  stats.dsp_min = UINT32_MAX;
  stats.dsp_max = 0;
  stats.classification_min = UINT32_MAX;
  stats.classification_max = 0;
  stats.anomaly_min = UINT32_MAX;
  stats.anomaly_max = 0;
  stats.total_min = UINT32_MAX;
  stats.total_max = 0;

  Serial.printf("Running %d inference tests...\n\n", NUM_INFERENCE_TESTS);

  for (int test = 0; test < NUM_INFERENCE_TESTS; test++) {
    // Collect samples
    Serial.printf("[Test %d/%d] Collecting samples... ", test + 1, NUM_INFERENCE_TESTS);
    fb_ix = 0;

    uint32_t sampling_start = millis();
    while (fb_ix < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE) {
      uint32_t t0 = micros();

      int16_t rx, ry, rz;
      adxl_read_xyz(rx, ry, rz);

      float ax = rx * G_PER_LSB * G_TO_MS2;
      float ay = ry * G_PER_LSB * G_TO_MS2;
      float az = rz * G_PER_LSB * G_TO_MS2;

      push_sample(ax, ay, az);

      uint32_t spent = micros() - t0;
      if (spent < PERIOD_US) {
        delayMicroseconds(PERIOD_US - spent);
      }
    }
    uint32_t sampling_time = millis() - sampling_start;
    Serial.printf("Done (%lu ms)\n", sampling_time);

    // Run inference with timing
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = &ei_get_data;

    ei_impulse_result_t result = {0};

    uint32_t inference_start = micros();
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
    uint32_t inference_total = micros() - inference_start;

    if (err == EI_IMPULSE_OK) {
      uint32_t dsp = result.timing.dsp;
      uint32_t classification = result.timing.classification;
      uint32_t anomaly = result.timing.anomaly;
      uint32_t total = dsp + classification + anomaly;

      // Update statistics
      dsp_sum += dsp;
      class_sum += classification;
      anom_sum += anomaly;
      total_sum += total;

      if (dsp < stats.dsp_min) stats.dsp_min = dsp;
      if (dsp > stats.dsp_max) stats.dsp_max = dsp;

      if (classification < stats.classification_min) stats.classification_min = classification;
      if (classification > stats.classification_max) stats.classification_max = classification;

      if (anomaly < stats.anomaly_min) stats.anomaly_min = anomaly;
      if (anomaly > stats.anomaly_max) stats.anomaly_max = anomaly;

      if (total < stats.total_min) stats.total_min = total;
      if (total > stats.total_max) stats.total_max = total;

      // Print result
      String label = "unknown";
      float max_conf = 0.0f;
      for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        if (result.classification[i].value > max_conf) {
          max_conf = result.classification[i].value;
          label = String(ei_classifier_inferencing_categories[i]);
        }
      }

      Serial.printf("    Classification: %s (%.1f%%), Anomaly: %.3f %s\n",
                   label.c_str(),
                   max_conf * 100.0f,
                   result.anomaly,
                   result.anomaly > ANOMALY_THRESHOLD ? "[ANOMALY]" : "[OK]");
      Serial.printf("    Latency: DSP=%lu ms, NN=%lu ms, Anomaly=%lu ms, Total=%lu ms (measured=%lu µs)\n\n",
                   dsp, classification, anomaly, total, inference_total);

    } else {
      Serial.printf("    ERROR: Inference failed with code %d\n\n", (int)err);
    }

    delay(500); // Small delay between tests
  }

  // Calculate averages
  stats.dsp_avg = dsp_sum / NUM_INFERENCE_TESTS;
  stats.classification_avg = class_sum / NUM_INFERENCE_TESTS;
  stats.anomaly_avg = anom_sum / NUM_INFERENCE_TESTS;
  stats.total_avg = total_sum / NUM_INFERENCE_TESTS;
}

void printLatencyReport(const LatencyStats &stats) {
  Serial.println("\n╔════════════════════════════════════════════════════════╗");
  Serial.println("║             LATENCY MEASUREMENT RESULTS                ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");

  Serial.println("┌─────────────────┬─────────┬─────────┬─────────┐");
  Serial.println("│ Component       │ Min (ms)│ Avg (ms)│ Max (ms)│");
  Serial.println("├─────────────────┼─────────┼─────────┼─────────┤");
  Serial.printf("│ DSP (FFT)       │  %6lu │  %6lu │  %6lu │\n",
                stats.dsp_min, stats.dsp_avg, stats.dsp_max);
  Serial.printf("│ Classification  │  %6lu │  %6lu │  %6lu │\n",
                stats.classification_min, stats.classification_avg, stats.classification_max);
  Serial.printf("│ Anomaly (K-means│  %6lu │  %6lu │  %6lu │\n",
                stats.anomaly_min, stats.anomaly_avg, stats.anomaly_max);
  Serial.println("├─────────────────┼─────────┼─────────┼─────────┤");
  Serial.printf("│ TOTAL           │  %6lu │  %6lu │  %6lu │\n",
                stats.total_min, stats.total_avg, stats.total_max);
  Serial.println("└─────────────────┴─────────┴─────────┴─────────┘\n");

  Serial.println("╔════════════════════════════════════════════════════════╗");
  Serial.println("║          COMPARISON WITH EDGE IMPULSE STUDIO           ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");

  Serial.println("Expected (from Edge Impulse):");
  Serial.println("  - DSP:            58 ms");
  Serial.println("  - Classification:  1 ms");
  Serial.println("  - Anomaly:       < 1 ms");
  Serial.println("  - Total:          59 ms\n");

  Serial.println("Measured (on ESP32):");
  Serial.printf("  - DSP:           %3lu ms\n", stats.dsp_avg);
  Serial.printf("  - Classification: %3lu ms\n", stats.classification_avg);
  Serial.printf("  - Anomaly:       %3lu ms\n", stats.anomaly_avg);
  Serial.printf("  - Total:         %3lu ms\n\n", stats.total_avg);

  // Calculate differences
  int32_t dsp_diff = (int32_t)stats.dsp_avg - 58;
  int32_t class_diff = (int32_t)stats.classification_avg - 1;
  int32_t total_diff = (int32_t)stats.total_avg - 59;

  Serial.println("Difference (Measured - Expected):");
  Serial.printf("  - DSP:           %+4ld ms (%s)\n",
                dsp_diff,
                abs(dsp_diff) <= 5 ? "✓ Good" : "⚠ Check");
  Serial.printf("  - Classification: %+4ld ms (%s)\n",
                class_diff,
                abs(class_diff) <= 2 ? "✓ Good" : "⚠ Check");
  Serial.printf("  - Total:         %+4ld ms (%s)\n\n",
                total_diff,
                abs(total_diff) <= 10 ? "✓ Good" : "⚠ Check");

  // Performance verdict
  if (abs(total_diff) <= 10) {
    Serial.println("✓ VERDICT: Inference latency matches Edge Impulse expectations!");
  } else if (total_diff > 0) {
    Serial.println("⚠ VERDICT: Inference is SLOWER than expected. Check:");
    Serial.println("   - CPU frequency (should be 240 MHz)");
    Serial.println("   - Compiler optimizations");
    Serial.println("   - Background tasks");
  } else {
    Serial.println("✓ VERDICT: Inference is FASTER than expected - Great!");
  }

  Serial.println("\n╔════════════════════════════════════════════════════════╗");
  Serial.println("║                   SYSTEM INFORMATION                   ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");
  Serial.printf("  - CPU Frequency:    %lu MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("  - Free Heap:        %lu bytes\n", ESP.getFreeHeap());
  Serial.printf("  - Chip Model:       %s\n", ESP.getChipModel());
  Serial.printf("  - Chip Revision:    %d\n", ESP.getChipRevision());
  Serial.printf("  - SDK Version:      %s\n", ESP.getSdkVersion());
  Serial.println();
}

// ==================== SETUP ====================
void setup() {
  // Initialize Serial
  Serial.begin(115200);
  while (!Serial) { delay(10); }
  delay(1000);

  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════════════════════╗");
  Serial.println("║     ESP32 EDGE IMPULSE INFERENCE LATENCY TEST          ║");
  Serial.println("║     Motor Anomaly Detection Performance Validation     ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");

  // Initialize SPI pins
  pinMode(PIN_CS, OUTPUT);
  digitalWrite(PIN_CS, HIGH);
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_CS);

  // Verify ADXL345 connection
  Serial.print("Checking ADXL345 connection... ");
  uint8_t devid = adxl_read8(REG_DEVID);
  if (devid != 0xE5) {
    Serial.println("FAILED!");
    Serial.printf("Device ID: 0x%02X (expected 0xE5)\n", devid);
    Serial.println("\nPlease check wiring and restart.\n");
    while (true) { delay(1000); }
  }
  Serial.println("OK!");

  // Configure ADXL345
  Serial.println("Configuring ADXL345...");
  adxl_write8(REG_POWER_CTL, 0x00);    // Standby
  adxl_write8(REG_DATA_FORMAT, 0x0B);  // Full-res, ±16g
  adxl_write8(REG_BW_RATE, 0x0C);      // 400 Hz ODR (FIXED: 0x0C not 0x0E)
  adxl_write8(REG_POWER_CTL, 0x08);    // Measurement mode
  Serial.println("Done!\n");

  // Print model information
  Serial.println("Model Information:");
  Serial.printf("  - Project:        Motor Anomaly Detection (ID: 813179)\n");
  Serial.printf("  - Sample Rate:    %.1f Hz\n", SAMPLE_HZ);
  Serial.printf("  - Window Size:    %d samples (%.1f seconds)\n",
                EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / 3,
                (EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE / 3) / SAMPLE_HZ);
  Serial.printf("  - Features:       %d\n", EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE);
  Serial.printf("  - Classes:        %d\n", EI_CLASSIFIER_LABEL_COUNT);
  for (uint16_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
    Serial.printf("    - %s\n", ei_classifier_inferencing_categories[i]);
  }
  Serial.printf("  - Anomaly:        %s\n", EI_CLASSIFIER_HAS_ANOMALY ? "Yes (K-means)" : "No");
  Serial.println();

  delay(2000);

  // Run latency tests
  LatencyStats stats;
  measureInferenceLatency(stats);
  printLatencyReport(stats);

  Serial.println("\n╔════════════════════════════════════════════════════════╗");
  Serial.println("║                    TEST COMPLETE                       ║");
  Serial.println("╚════════════════════════════════════════════════════════╝\n");
  Serial.println("You can now:");
  Serial.println("  1. Compare results with Edge Impulse Studio");
  Serial.println("  2. Reset to run test again");
  Serial.println("  3. Flash production firmware\n");
}

// ==================== MAIN LOOP ====================
void loop() {
  // Test complete - just wait
  delay(1000);
}
