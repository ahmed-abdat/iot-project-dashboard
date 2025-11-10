# ESP32 Motor Monitor Setup Guide

## Hardware Requirements

- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **ADXL345 Accelerometer** (SPI module - full resolution mode)
- **LCD 16x2 with I2C adapter** (Optional - for local monitoring)
- **USB Cable** (for programming and power)
- **Jumper Wires**

## Wiring Diagram

### ADXL345 (SPI Connection)

```
ADXL345        ESP32
────────       ────────
VCC     ───>   3.3V
GND     ───>   GND
CS      ───>   GPIO 5
SCK     ───>   GPIO 18
MISO    ───>   GPIO 19
MOSI    ───>   GPIO 23
INT1    ───>   GPIO 4 (Optional)
```

### I2C LCD Display (Optional but recommended)

```
LCD 16x2       ESP32
────────       ────────
VCC     ───>   5V
GND     ───>   GND
SDA     ───>   GPIO 21
SCL     ───>   GPIO 22
```

**Important**:
- Use 3.3V for ADXL345, NOT 5V
- LCD can use 5V
- If LCD address 0x27 doesn't work, try 0x3F

## Software Requirements

### 1. Arduino IDE Setup

Download and install Arduino IDE 2.x: https://www.arduino.cc/en/software

### 2. ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "ESP32" and install **"esp32 by Espressif Systems"**

### 3. Required Libraries

Install via **Tools → Manage Libraries**:

- **ArduinoJson** (v6.21.0 or newer) - for Firebase JSON payloads
- **LiquidCrystal I2C** by Frank de Brabander (latest version) - for LCD display

### 4. Edge Impulse Library

1. Go to your Edge Impulse project: https://studio.edgeimpulse.com/studio/813179
2. Navigate to **Deployment** tab
3. Select **Arduino library**
4. Click **Build** and download the ZIP file
5. In Arduino IDE: **Sketch → Include Library → Add .ZIP Library**
6. Select the downloaded Edge Impulse ZIP file

## Configuration

### 1. WiFi Credentials

Edit `config.h`:

```cpp
#define WIFI_SSID "YourWiFiNetwork"
#define WIFI_PASSWORD "YourWiFiPassword"
```

### 2. Firebase Setup

Get your Firebase credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ **Project Settings**
4. Copy **Project ID**
5. Under "Web API Key", copy the key

Edit `config.h`:

```cpp
#define FIREBASE_PROJECT_ID "your-project-id"
#define FIREBASE_API_KEY "AIzaSyC...your-api-key"
```

### 3. Device ID (Optional)

Change the device identifier if using multiple ESP32 units:

```cpp
#define DEVICE_ID "ESP32_MOTOR_01"
```

## Upload to ESP32

### 1. Select Board

- **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

### 2. Select Port

- **Tools → Port →** Select your ESP32's COM port (e.g., COM3, /dev/ttyUSB0)

### 3. Upload Settings

- **Upload Speed**: 921600
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 4MB (or match your board)
- **Partition Scheme**: Default

### 4. Compile and Upload

1. Click **Verify** (✓) to compile
2. Click **Upload** (→) to flash to ESP32
3. Open **Serial Monitor** (115200 baud) to view output

## Troubleshooting

### ESP32 Not Detected

- Install CP210x or CH340 USB drivers
- Try different USB cable (data cable, not charge-only)
- Press BOOT button while uploading

### ADXL345 Not Found

```
ERROR: ADXL345 not detected!
```

**Solutions**:
- Check wiring (SDA=21, SCL=22)
- Verify 3.3V power supply
- Test I2C scanner sketch

### WiFi Connection Failed

```
✗ WiFi connection failed!
```

**Solutions**:
- Verify SSID and password in `config.h`
- Check WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router

### Firebase Upload Errors

```
Firebase error: 400
```

**Solutions**:
- Verify Firebase credentials in `config.h`
- Check Firestore security rules allow writes
- Ensure collections exist: `sensor_data`, `sensor_realtime`

### Inference Errors

```
ERR: Inference failed
```

**Solutions**:
- Verify Edge Impulse library is correctly installed
- Check sampling frequency matches training (390 Hz)
- Ensure window size is 2 seconds

## Expected Serial Output

When working correctly, you should see:

```
=== Motor Anomaly Detection + Firebase Dashboard ===
ESP32 + ADXL345 + Edge Impulse + Firebase
====================================================

Checking ADXL345... OK!
Configuring ADXL345...
Interrupt enabled on pin 4
Connecting to WiFi: YourNetwork
✓ WiFi connected!
IP Address: 192.168.1.100
System ready!
Sampling rate: 374.0 Hz
Window size: 780 samples
HPF Alpha: 0.00 (0=off)
Firebase upload: every 500 ms

Running inference...
--- Inference Results ---
DSP: 45 ms, Classification: 12 ms, Anomaly: 8 ms
Classifications:
  idle: 0.05432
  nominal: 0.94568
Anomaly Score: 0.12500 ✓ Normal
------------------------
```

## Performance Metrics

- **Sampling Rate**: 374 Hz (400 Hz ADXL345 ODR)
- **Inference Rate**: Continuous with 2s window, 500ms stride
- **Firebase Upload Rate**: 2 Hz (every 500ms)
- **Latency**: ~65ms (DSP + Classification + Anomaly detection)
- **WiFi Data Usage**: ~5-6KB per minute
- **Power Consumption**: ~150-200mA @ 5V (with LCD backlight)

## Firestore Data Structure

Each reading creates documents in:

### `sensor_realtime/{deviceId}`
Single document updated every 500ms:

```json
{
  "deviceId": "ESP32_MOTOR_01",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "status": "active",
  "accX": 0.23,
  "accY": -0.15,
  "accZ": 9.81,
  "classification": "nominal",
  "classificationConfidence": 94.3,
  "anomalyScore": 12.5,
  "isAnomaly": false
}
```

### `sensor_data/`
New document created every 500ms for historical storage

## Next Steps

1. Upload code to ESP32
2. Verify data appears in Firebase Console
3. Open Next.js dashboard: http://localhost:3000
4. Monitor real-time motor health data

## Support

- Edge Impulse Docs: https://docs.edgeimpulse.com/
- ESP32 Arduino Core: https://docs.espressif.com/projects/arduino-esp32/
- Firebase REST API: https://firebase.google.com/docs/firestore/use-rest-api
