# ESP32 Implementation Guide

## Firebase Schema

### Sensor Data Collection

```typescript
interface SensorData {
  deviceId: string; // e.g., "esp32-001"
  temperature: number; // in Celsius
  humidity: number; // in percentage
  pressure: number; // in hPa
  distance: number; // in centimeters
  timestamp: Timestamp; // Firebase timestamp
  status: "active" | "inactive";
}
```

## Required Libraries

```cpp
// Arduino Libraries
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Sensor Libraries
#include <DHT.h>        // For DHT22 sensor
#include <NewPing.h>    // For HC-SR04 ultrasonic sensor
```

## Hardware Setup

1. **Pin Connections**

   DHT22 Sensor:

   - VCC: 3.3V
   - GND: GND
   - DATA: GPIO4 (or your preferred digital pin)

   MQ-4 Gas Sensor:

   - VCC: 5V
   - GND: GND
   - AOUT: GPIO34 (or another ADC pin)
   - DOUT: Not used for analog readings

   HC-SR04 Ultrasonic Sensor:

   - VCC: 5V
   - GND: GND
   - TRIG: GPIO5
   - ECHO: GPIO18

2. **Sensor Initialization**

```cpp
#define DHT_PIN 4        // DHT22 data pin
#define MQ4_PIN 34       // MQ-4 analog input pin
#define DHT_TYPE DHT22   // DHT22 (AM2302)
#define TRIG_PIN 5       // HC-SR04 trigger pin
#define ECHO_PIN 18      // HC-SR04 echo pin
#define MAX_DISTANCE 400 // Maximum distance in centimeters

DHT dht(DHT_PIN, DHT_TYPE);
NewPing sonar(TRIG_PIN, ECHO_PIN, MAX_DISTANCE);

void setupSensors() {
  dht.begin();
  pinMode(MQ4_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}
```

## Example Code Structure

```cpp
void setup() {
  Serial.begin(115200);
  setupWiFi();
  setupSensors();
  configTime(0, 0, "pool.ntp.org");
}

// Read sensor data
SensorData readSensorData() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int gasReading = analogRead(MQ4_PIN);  // Raw analog value (0-4095)
  float distance = sonar.ping_cm();      // Distance in centimeters

  // Convert gas reading to PPM if needed
  // Note: Proper calibration might be needed for accurate PPM values
  float gasPPM = map(gasReading, 0, 4095, 0, 10000); // Example mapping

  return {
    "deviceId": "esp32-001",
    "temperature": temperature,
    "humidity": humidity,
    "gasLevel": gasPPM,
    "distance": distance,
    "timestamp": getCurrentTime(),
    "status": "active"
  };
}

void loop() {
  // Read sensor data
  SensorData data = readSensorData();

  // Send to Firebase
  if (sendToFirebase(data)) {
    Serial.println("Data sent successfully");
  } else {
    Serial.println("Failed to send data");
  }

  // Wait for next reading
  delay(updateInterval * 1000);
}
```

## Error Handling

1. **Sensor Reading**
   ```cpp
   bool isValidReading(float temperature, float humidity, float distance) {
     // Check if readings are valid numbers
     if (isnan(temperature) || isnan(humidity)) {
       Serial.println("Failed to read from DHT sensor!");
       return false;
     }
     if (distance == 0) {
       Serial.println("Failed to read from ultrasonic sensor!");
       return false;
     }
     return true;
   }
   ```

## Power Management

1. **Deep Sleep Mode**

   ```cpp
   void enterDeepSleep(uint64_t sleepTime) {
     esp_sleep_enable_timer_wakeup(sleepTime * 1000000);
     esp_deep_sleep_start();
   }
   ```

2. **Battery Monitoring**
   - Monitor voltage level
   - Adjust reading frequency
   - Send battery status

## Testing

1. **Sensor Calibration**

   - Compare with reference sensor
   - Adjust readings if needed
   - Document calibration process
   - Test ultrasonic sensor accuracy with known distances

2. **Network Testing**

   - Test different WiFi conditions
   - Measure power consumption
   - Monitor data accuracy

3. **Error Simulation**
   - Test sensor disconnection
   - Test network failures
   - Test invalid readings
   - Test ultrasonic sensor edge cases (too close/far)

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**

   - Check WiFi credentials
   - Verify Firebase configuration
   - Check network stability

2. **Sensor Issues**

   - Verify wiring connections
   - Check power supply
   - Validate I2C address
   - Check ultrasonic sensor alignment

3. **Data Issues**
   - Verify data format
   - Check timestamp accuracy
   - Validate reading ranges
   - Check distance measurement consistency

## Security Considerations

1. **Authentication**

   - Use secure token storage
   - Implement token rotation
   - Monitor failed auth attempts

2. **Data Protection**

   - Validate data before sending
   - Use HTTPS for communication
   - Implement rate limiting

3. **Device Security**
   - Use unique device IDs
   - Implement OTA updates
   - Monitor device status

## Optimization Tips

1. **Power Efficiency**

   - Use deep sleep between readings
   - Optimize sensor reading time
   - Minimize WiFi active time
   - Consider ultrasonic sensor power usage

2. **Memory Usage**

   - Use static JSON buffers
   - Minimize string operations
   - Clear unused variables

3. **Network Efficiency**
   - Batch readings when possible
   - Compress data if needed
   - Optimize payload size
