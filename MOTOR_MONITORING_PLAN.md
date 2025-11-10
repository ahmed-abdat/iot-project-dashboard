# Motor Health Monitoring Dashboard - Implementation Plan

**Project**: Adaptation of IoT Dashboard for ADXL345 Motor Monitoring
**Date Started**: 2025-11-07
**Target Platform**: Next.js 14 + Firebase + ESP32 + TinyML (Edge Impulse)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [Implementation Progress](#implementation-progress)
5. [Technical Specifications](#technical-specifications)
6. [Migration Strategy](#migration-strategy)
7. [Testing Plan](#testing-plan)
8. [Known Issues & Questions](#known-issues--questions)

---

## 🎯 Project Overview

### Objective
Transform existing IoT sensor dashboard (temperature/humidity/pressure/gas) into a **Motor Health Monitoring System** using ADXL345 accelerometer data with TinyML-based anomaly detection.

### Key Features
- ✅ Real-time motor status monitoring (Idle/Nominal)
- ✅ Vibration analysis (3-axis acceleration)
- ✅ TinyML anomaly detection (K-means clustering)
- ✅ Historical data storage and trending
- ✅ Configurable alerts and notifications
- ✅ Predictive maintenance insights

### Hardware Components
- **ESP32**: Microcontroller with WiFi
- **ADXL345**: 3-axis accelerometer (390 Hz sampling)
- **Power**: LM2596 voltage regulator
- **Motor**: Leroy Somer (test platform)

### Software Stack
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Recharts
- **Backend**: Firebase/Firestore (real-time database)
- **ML**: Edge Impulse (TinyML deployment)
- **ESP32**: Arduino framework with Edge Impulse library

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ESP32 Device                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   ADXL345    │───▶│   TinyML     │───▶│   Firebase   │  │
│  │ (390 Hz)     │    │  Inference   │    │    HTTP      │  │
│  │  X, Y, Z     │    │  (59ms)      │    │   Client     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │              Every 500ms           Send JSON       │
│         │             (2s window,             Payload        │
│         │              75% overlap)                │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          │                    │                    ▼
          │                    │         ┌──────────────────┐
          │                    │         │    Firestore     │
          │                    │         │   Collections    │
          │                    │         │ ┌──────────────┐ │
          │                    │         │ │sensor_data   │ │
          │                    │         │ │sensor_realtime│ │
          │                    └────────▶│ │sensor_history │ │
          │                              │ └──────────────┘ │
          │                              └──────────────────┘
          │                                       │
          │                                       │ Real-time
          │                                       │ Listeners
          │                                       ▼
          │                              ┌──────────────────┐
          │                              │   Next.js App    │
          │                              │  ┌────────────┐  │
          │                              │  │  Dashboard │  │
          │                              │  │   Charts   │  │
          │                              │  │   Alerts   │  │
          │                              │  └────────────┘  │
          │                              └──────────────────┘
          │
    Raw Data @ 390Hz
    (2s = 780 samples)
    ───────────────▶ DSP Block (FFT, 58ms)
                    ───────────────▶ 399 Features
                                   ───────▶ Neural Network (1ms)
                                           ───────▶ Classification
                                   ───────▶ K-means (< 1ms)
                                           ───────▶ Anomaly Score
```

### Edge Impulse TinyML Pipeline

```
ADXL345 Raw Data (accX, accY, accZ @ 390Hz)
         │
         ▼
┌─────────────────────────────────────────┐
│  DSP Block - Spectral Analysis (58ms)   │
│  • FFT 256 points                        │
│  • Extract 399 features:                 │
│    - RMS per axis                        │
│    - Skewness, Kurtosis                  │
│    - 128 spectral power bands            │
└─────────────────────────────────────────┘
         │
         ▼
    399 Features
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌─────────┐  ┌──────────────┐
│ Neural  │  │   K-means    │
│ Network │  │   Anomaly    │
│ (1ms)   │  │  Detection   │
│         │  │   (<1ms)     │
│ 20→8→2  │  │  32 clusters │
└─────────┘  └──────────────┘
    │              │
    ▼              ▼
Classification  Anomaly Score
(idle/nominal)    (0-100)
    │              │
    └──────┬───────┘
           │
           ▼
    Send to Firebase
```

---

## 🔄 Data Flow

### ESP32 to Firebase

**Sampling**: 390 Hz (every 2.56ms)
**Window**: 2000ms (780 samples)
**Stride**: 500ms (75% overlap)
**Transmission**: Every 500ms

**JSON Payload Structure**:
```json
{
  "deviceId": "esp32-motor-001",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "status": "active",

  "accX": -0.45,
  "accY": 0.23,
  "accZ": 9.81,

  "classification": "nominal",
  "classificationConfidence": 98.5,

  "anomalyScore": 15.2,
  "isAnomaly": false,

  "rms": 1.23,
  "vibrationMagnitude": 2.15
}
```

### Firebase Collections

**`sensor_realtime/`**: Current device state (latest reading per device)
- Used for: Dashboard live view
- Retention: Keep only latest document per deviceId
- Update frequency: Every 500ms

**`sensor_data/`**: Historical time-series data
- Used for: Trends, analytics, charts
- Retention: All data (or configurable cleanup)
- Document per reading

**`sensor_history/`**: Aggregated statistics
- Used for: Long-term trends, reports
- Aggregation: Hourly/Daily summaries
- Contains: avg, min, max, count per time period

---

## ✅ Implementation Progress

### Phase 1: Data Structure (Completed ✅)
- [x] Update TypeScript types (`types/sensor.ts`)
  - New `SensorData` interface with motor fields
  - Helper functions for UI (colors, severity, calculations)
  - Motor classification and status types
- [x] Update Firebase constants (`config/firebase-constants.ts`)
  - Field names for motor data
  - Sampling configuration constants (390 Hz, 2s window, 500ms stride)
  - Anomaly and vibration thresholds
- [x] Create Firebase management scripts
  - `scripts/firebase-cleanup.ts`: Clean old data
  - `scripts/firebase-validate-schema.ts`: Validate new schema
  - `scripts/README.md`: Documentation

### Phase 2: Data Layer & Hooks (In Progress 🔄)
- [ ] Update `hooks/use-sensor-data.ts`
  - Modify for new motor data structure
  - Update real-time listeners
  - Update historical data queries
- [ ] Create `hooks/use-motor-analytics.ts`
  - `useMotorStatus()`: Current motor state
  - `useAnomalyDetection()`: Real-time anomaly alerts
  - `useVibrationTrends()`: Historical vibration analysis
  - `useMotorHealth()`: Overall health score
- [ ] Update `hooks/use-alerts.ts`
  - Motor-specific alert rules
  - Anomaly threshold alerts
  - Vibration level warnings

### Phase 3: UI Components (Pending 📝)
- [ ] Update `components/sensor-card.tsx`
  - Motor status card (Idle/Nominal with confidence)
  - Acceleration card (X/Y/Z real-time values)
  - Anomaly detection card (score gauge)
  - Vibration metrics card (RMS, magnitude)
- [ ] Create `components/motor-charts.tsx`
  - Time-series acceleration chart (X/Y/Z lines)
  - Vibration magnitude trend (last 24h)
  - Anomaly score timeline with markers
  - Classification distribution (pie/bar chart)
- [ ] Create `components/motor-status-indicator.tsx`
  - Visual motor state indicator
  - Confidence level display
  - Status history mini-chart

### Phase 4: Dashboard Pages (Pending 📝)
- [ ] Update `app/page.tsx`
  - New layout for motor monitoring
  - Live status overview section
  - Real-time charts section
  - Recent anomalies section
- [ ] Create `app/analytics/page.tsx`
  - Historical trends
  - Anomaly frequency analysis
  - Motor operation patterns
  - Predictive maintenance insights
- [ ] Update `app/settings/page.tsx`
  - Anomaly threshold configuration
  - Alert preferences
  - Device management

### Phase 5: Alert System (Pending 📝)
- [ ] Update alert monitoring
  - Anomaly score threshold exceeded
  - Continuous anomalies detected
  - Motor status changes
  - Excessive vibration levels
  - Sensor communication loss
- [ ] Configure notifications
  - Browser push notifications
  - Email alerts (if configured)
  - Visual dashboard indicators

### Phase 6: ESP32 Integration (Pending 📝)
- [ ] Create `ESP32_MOTOR_SETUP.md`
  - ADXL345 wiring and configuration
  - Edge Impulse library integration
  - Firebase HTTP client setup
  - Complete Arduino code example
- [ ] Update existing `ESP32_GUIDE.md`
  - Remove old sensor references
  - Add motor monitoring specifics
  - Troubleshooting section

### Phase 7: Testing & Validation (Pending 📝)
- [ ] Unit tests for helper functions
- [ ] Integration tests for data flow
- [ ] E2E tests for critical workflows
- [ ] Performance testing (Firebase quota)
- [ ] Real hardware testing with ESP32

### Phase 8: Documentation (Pending 📝)
- [ ] Update `README.md`
  - New features description
  - Updated screenshots
  - Setup instructions
- [ ] Create deployment guide
- [ ] Write troubleshooting guide
- [ ] Document Firebase rules

---

## 🔧 Technical Specifications

### Edge Impulse Model (Project 813179)

**Sampling Configuration**:
- Frequency: 390 Hz
- Window: 2000ms (2 seconds)
- Stride: 500ms (75% overlap)
- Samples per window: 780

**DSP Block - Spectral Analysis**:
- FFT length: 256 points
- Resolution: 1.52 Hz per bin
- Frequency range: 0.76 Hz to 195.76 Hz
- Features extracted: 399 (133 per axis)
  - RMS
  - Skewness, Kurtosis
  - Spectral Skewness, Kurtosis
  - 128 spectral power bands

**Neural Network Classifier**:
- Architecture: 399 → 20 → 8 → 2
- Activation: ReLU (hidden), Softmax (output)
- Dropout: 10%
- Quantization: int8
- Size: 10 KB (Flash)
- Latency: 1 ms
- Accuracy: 99.71%

**K-means Anomaly Detection**:
- Clusters: 32
- Features used: 4 selected features
  - accX RMS
  - accX Spectral Power (5.33-6.86 Hz)
  - accX Spectral Power (37.32-38.85 Hz)
  - accX Spectral Power (67.79-69.32 Hz)
- Size: 8 KB (Flash)
- Latency: <1 ms

**System Performance**:
- Total latency: 59 ms (58ms DSP + 1ms NN)
- Real-time factor: 34× (2000ms / 59ms)
- RAM usage: 13 KB
- Flash usage: ~40 KB total
- Accuracy: 99.71%
- Battery life (estimated): 946 hours (~39 days)

### Firebase Structure

**Security Rules** (to be configured):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Real-time data - read public, write authenticated
    match /sensor_realtime/{deviceId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if false; // Prevent accidental deletion
    }

    // Historical data
    match /sensor_data/{document} {
      allow read: if true;
      allow write: if request.auth != null;
      allow delete: if request.auth != null; // Allow cleanup
    }

    // Aggregated history
    match /sensor_history/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Indexes** (to be created for performance):
```
Collection: sensor_data
- deviceId (Ascending), timestamp (Descending)
- status (Ascending), timestamp (Descending)
- isAnomaly (Ascending), timestamp (Descending)
- classification (Ascending), timestamp (Descending)
```

---

## 🔄 Migration Strategy

### Step-by-Step Migration

**1. Backup Current Data** ⚠️
```bash
# Export from Firebase Console
# Project Settings → Service accounts → Generate new private key
# Use Firebase CLI to export
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

**2. Validate Current Schema**
```bash
npx ts-node scripts/firebase-validate-schema.ts --limit=50
```

**3. Clean Old Data (Dry Run First)**
```bash
# Preview what will be deleted
npx ts-node scripts/firebase-cleanup.ts --dry-run

# If satisfied, run actual cleanup
npx ts-node scripts/firebase-cleanup.ts
```

**4. Update Firebase Security Rules**
- Go to Firebase Console → Firestore Database → Rules
- Update rules as shown in Technical Specifications
- Test rules with Firebase Rules Playground

**5. Deploy Next.js Changes**
```bash
npm run build
npm start
# Or deploy to Vercel/Firebase Hosting
```

**6. Configure ESP32**
- Flash new code with Edge Impulse library
- Configure WiFi and Firebase credentials
- Test data transmission

**7. Validate New Schema**
```bash
# After ESP32 starts sending data
npx ts-node scripts/firebase-validate-schema.ts
```

**8. Monitor and Test**
- Check dashboard for real-time updates
- Verify historical data storage
- Test alert notifications
- Monitor Firebase quota usage

---

## 🧪 Testing Plan

### Unit Tests
- [ ] Helper functions in `types/sensor.ts`
  - `calculateVibrationMagnitude()`
  - `getAnomalySeverity()`
  - `isAnomalyFromScore()`
- [ ] Data transformation functions
- [ ] Validation logic

### Integration Tests
- [ ] Firebase real-time listeners
- [ ] Data fetching hooks
- [ ] Alert system triggers

### E2E Tests (Critical Workflows)
- [ ] ESP32 sends data → Dashboard displays
- [ ] Anomaly threshold exceeded → Alert triggered
- [ ] Historical data query and display
- [ ] Multiple devices management

### Performance Tests
- [ ] Firebase read/write quota usage
- [ ] Dashboard rendering with 100+ data points
- [ ] Real-time update latency
- [ ] Chart rendering performance

### Hardware Tests
- [ ] ESP32 + ADXL345 data accuracy
- [ ] TinyML inference time verification
- [ ] WiFi stability over extended period
- [ ] Battery life measurement
- [ ] Motor vibration detection accuracy

---

## ❓ Known Issues & Questions

### 1. RMS and Vibration Magnitude Calculation

**Question**: Where do `rms` and `vibrationMagnitude` come from?

**Options**:

**Option A: Calculate on ESP32** (Recommended ✅)
- ESP32 calculates from 780 samples in 2s window
- RMS formula: `sqrt(mean(accX² + accY² + accZ²))`
- Magnitude: `sqrt(accX² + accY² + accZ²)` at each sample
- **Pros**: More accurate, uses all 780 samples
- **Cons**: Slightly more ESP32 processing

**Option B: Calculate on Next.js Dashboard**
- Use single accX, accY, accZ values from each reading
- Calculate client-side in React components
- **Pros**: Less ESP32 processing
- **Cons**: Less accurate (only 1 sample, not full window)

**Option C: Extract from Edge Impulse DSP Features**
- Edge Impulse DSP block calculates RMS per axis
- ESP32 reads these from inference results
- Combine: `totalRMS = sqrt(rmsX² + rmsY² + rmsZ²)`
- **Pros**: Most efficient, already calculated
- **Cons**: Need to access feature values from inference

**Decision Needed**: User to confirm approach ⏳

**Current Implementation**: Schema includes these fields, ESP32 code needs update

### 2. Anomaly Threshold Configuration

**Question**: Should anomaly threshold be:
- Hardcoded in ESP32?
- Configurable from dashboard?
- Both (ESP32 default + override from Firebase)?

**Current**: Hardcoded as 80 in constants

### 3. Data Retention Policy

**Question**: How long to keep historical data?
- All data forever?
- Delete after X days/months?
- Aggregate old data to reduce storage?

**Recommendation**: Keep detailed data for 30 days, then aggregate to hourly summaries

### 4. Multi-Device Support

**Question**: Dashboard should:
- Display all devices?
- Select one device at a time?
- Comparison view?

**Current**: Hooks support filtering by deviceId

### 5. Sampling Rate Discrepancy

**Note**: Edge Impulse shows 390 Hz, but PFE report mentions 800 Hz
- Need to verify actual ADXL345 configuration
- Update documentation accordingly

---

## 📚 References

### Edge Impulse
- Project URL: https://studio.edgeimpulse.com/studio/813179
- Documentation: https://docs.edgeimpulse.com/
- Arduino Deployment: https://docs.edgeimpulse.com/docs/deployment/deploy-your-model-as-an-arduino-library

### Hardware Datasheets
- ESP32: https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf
- ADXL345: https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL345.pdf

### Standards
- ISO 10816: Vibration measurement on machines
- ISO 20816: Mechanical vibration evaluation
- ISO 13374: Condition monitoring and diagnostics

---

## 📝 Next Steps

1. **Resolve RMS/Magnitude Question** ⏳
   - Decide calculation approach
   - Update ESP32 code accordingly

2. **Complete Data Layer** (Current Phase)
   - Update hooks for new schema
   - Create motor analytics hooks
   - Test real-time data flow

3. **Build UI Components**
   - Motor status cards
   - Live charts
   - Alert indicators

4. **ESP32 Integration**
   - Update Arduino code
   - Test with actual hardware
   - Validate data accuracy

5. **Testing & Deployment**
   - End-to-end testing
   - Performance optimization
   - Production deployment

---

**Last Updated**: 2025-11-07
**Status**: Phase 1 Complete, Phase 2 In Progress
**Next Milestone**: Complete data layer and hooks
