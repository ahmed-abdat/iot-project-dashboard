/*  ESP32 + ADXL345 (SPI)  → Edge Impulse data-forwarder
    ----------------------------------------------------
    Wiring (SPI):
      ADXL345  →  ESP32
      VCC  → 3V3   (NOT 5V)
      GND  → GND
      CS   → GPIO 5
      SDO(MISO) → GPIO 19
      SDA(MOSI) → GPIO 23
      SCL(SCK)  → GPIO 18
    Optional data-ready interrupt:
      INT1 → GPIO 4  (active high, configure below)

    Output format (for EI forwarder): ax,ay,az\n  (m/s^2, floats)
    No labels, no timestamps printed.
*/

#include <SPI.h>
#include <math.h>

// ----------------------------- PINS -----------------------------
#define PIN_CS    5
#define PIN_SCK   18
#define PIN_MISO  19
#define PIN_MOSI  23
#define PIN_INT1  4     // set to -1 if not used

// ---------------------- ADXL345 REGISTERS -----------------------
#define REG_DEVID        0x00
#define REG_BW_RATE      0x2C
#define REG_POWER_CTL    0x2D
#define REG_INT_ENABLE   0x2E
#define REG_INT_MAP      0x2F
#define REG_DATA_FORMAT  0x31
#define REG_DATAX0       0x32

// ----------------------- USER SETTINGS --------------------------
static const float    EI_FREQUENCY_HZ = 400.0f;           // target sample rate
static const uint32_t PERIOD_US       = (uint32_t)(1e6f / EI_FREQUENCY_HZ);

// keep output as 3 axes; set true to send only magnitude (1 column)
static const bool STREAM_MAGNITUDE_ONLY = false;

// simple 1st-order high-pass (remove gravity/DC). Set to 0 to disable.
static const float HPF_ALPHA = 0.0f;  // e.g. 0.98f for ~very low cutoff; 0.0f = off

// --------------------- INTERNAL STATE/VARS ----------------------
static volatile bool g_drdy = false;   // set by ISR when INT1 used

// Full-res scale for ADXL345 at ±16g: ~0.004 g/LSB
static const float G_PER_LSB = 0.004f;
static const float G_TO_MS2  = 9.80665f;

// ---------------------- LOW-LEVEL HELPERS -----------------------
inline uint8_t adxl_read8(uint8_t reg) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3)); // up to ~5 MHz
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | reg);      // read, single
  uint8_t v = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
  return v;
}

inline void adxl_write8(uint8_t reg, uint8_t val) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(reg);             // write
  SPI.transfer(val);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
}

// burst read X/Y/Z (6 bytes)
inline void adxl_read_xyz(int16_t &x, int16_t &y, int16_t &z) {
  SPI.beginTransaction(SPISettings(5000000, MSBFIRST, SPI_MODE3));
  digitalWrite(PIN_CS, LOW);
  SPI.transfer(0x80 | 0x40 | REG_DATAX0);  // read + multibyte
  uint8_t x0 = SPI.transfer(0x00), x1 = SPI.transfer(0x00);
  uint8_t y0 = SPI.transfer(0x00), y1 = SPI.transfer(0x00);
  uint8_t z0 = SPI.transfer(0x00), z1 = SPI.transfer(0x00);
  digitalWrite(PIN_CS, HIGH);
  SPI.endTransaction();
  x = (int16_t)((x1 << 8) | x0);
  y = (int16_t)((y1 << 8) | y0);
  z = (int16_t)((z1 << 8) | z0);
}

// --------------------------- ISR -------------------------------
void IRAM_ATTR isr_data_ready() {
  g_drdy = true;
}

// -------------------------- SETUP ------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(PIN_CS, OUTPUT);
  digitalWrite(PIN_CS, HIGH);
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_CS);

  // Check device ID
  uint8_t devid = adxl_read8(REG_DEVID);
  if (devid != 0xE5) {
    // Keep forwarder happy (numbers only); emit zeros if sensor missing
    while (true) { Serial.println("0,0,0"); delay(50); }
  }

  // Standby
  adxl_write8(REG_POWER_CTL, 0x00);

  // Full-resolution, ±16g (FULL_RES=1, RANGE=0b11 -> 0x0B)
  adxl_write8(REG_DATA_FORMAT, 0x0B);

  // ODR = 400 Hz (0x0E). If EI detects ~374 Hz it’s OK; keep steady timing.
  adxl_write8(REG_BW_RATE, 0x0E);

  // Optional: enable DATA_READY interrupt on INT1 (map DRDY to INT1 = 0)
  if (PIN_INT1 >= 0) {
    adxl_write8(REG_INT_MAP, 0x00);      // DRDY on INT1
    adxl_write8(REG_INT_ENABLE, 0x80);   // enable DATA_READY
    pinMode(PIN_INT1, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIN_INT1), isr_data_ready, RISING);
  }

  // Measurement mode
  adxl_write8(REG_POWER_CTL, 0x08);

  delay(10);
}

// --------------------------- LOOP ------------------------------
void loop() {
  // Pace each sample to target frequency
  const uint32_t t_start = micros();

  // If using INT1, wait for a fresh sample (prevents jitter)
  if (PIN_INT1 >= 0) {
    // small timeout guard
    uint32_t t0 = micros();
    while (!g_drdy && (micros() - t0) < 2000) { /* wait up to 2ms */ }
    g_drdy = false;
  }

  // Read raw
  int16_t rx, ry, rz;
  adxl_read_xyz(rx, ry, rz);

  // Convert to m/s^2
  float ax = rx * G_PER_LSB * G_TO_MS2;
  float ay = ry * G_PER_LSB * G_TO_MS2;
  float az = rz * G_PER_LSB * G_TO_MS2;

  // Optional simple high-pass (very light DC removal)
  if (HPF_ALPHA > 0.0f && HPF_ALPHA < 1.0f) {
    static float hx=0, hy=0, hz=0, px=0, py=0, pz=0;
    // 1st-order HPF via leaky integrator (difference from slow baseline)
    hx = HPF_ALPHA * (hx + ax - px); px = ax; ax = hx;
    hy = HPF_ALPHA * (hy + ay - py); py = ay; ay = hy;
    hz = HPF_ALPHA * (hz + az - pz); pz = az; az = hz;
  }

  if (STREAM_MAGNITUDE_ONLY) {
    float mag = sqrtf(ax*ax + ay*ay + az*az);
    Serial.println(mag, 6);
  } else {
    // IMPORTANT: numbers only, comma-separated, newline at end
    Serial.print(ax, 6); Serial.print(',');
    Serial.print(ay, 6); Serial.print(',');
    Serial.println(az, 6);
  }

  // Keep steady sample rate
  const uint32_t spent = micros() - t_start;
  if (spent < PERIOD_US) delayMicroseconds(PERIOD_US - spent);
}
