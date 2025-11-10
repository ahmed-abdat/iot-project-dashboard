# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Motor Health Monitoring Dashboard - A specialized IoT system for real-time motor anomaly detection using Edge Impulse TinyML on ESP32 with ADXL345 accelerometer. This project transforms accelerometer vibration data (374 Hz sampling) into actionable insights through K-means clustering and neural network classification, displaying results via a Next.js 16 dashboard with 2 Hz real-time updates.

**Related Project**: Academic thesis documentation at `/home/ahmed/Downloads/master-pfe/my-pfe-report` (LaTeX)

## Development Commands

```bash
# Development server (Next.js 16)
pnpm dev                # Start dev server at localhost:3000

# Build and production
pnpm build             # Production build
pnpm start             # Production server
pnpm lint              # ESLint checking

# Package management
pnpm install           # Install dependencies (uses pnpm, not npm)
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 16.0.1 (App Router, React Server Components)
- **Runtime**: React 19.2.0 with TypeScript 5.2.2 (strict mode)
- **UI**: Shadcn UI (44 Radix primitives) + Tailwind CSS 3.3.3
- **State**: Zustand 5.0.2 with persistence middleware
- **Backend**: Firebase 12.5.0 (Firestore real-time + Authentication)
- **Charts**: Recharts 2.15.0
- **Forms**: React Hook Form 7.53.0 + Zod 3.23.8 validation
- **Data Fetching**: TanStack Query 5.62.11

### Data Flow Architecture
```
ADXL345 (374 Hz) → ESP32 (SPI) → Edge Impulse TinyML (2s window, 500ms stride)
    ↓
Firebase Firestore (2 Hz updates)
    ↓
Next.js Dashboard (Real-time listeners)
```

### Core Data Model
```typescript
interface SensorData {
  deviceId: string;              // e.g., "ESP32_MOTOR_01"
  timestamp: Timestamp;          // Firebase timestamp
  status: "active" | "inactive" | "error";

  // Raw 3-axis acceleration (m/s²)
  accX: number;
  accY: number;
  accZ: number;

  // TinyML Classification
  classification: "idle" | "nominal";
  classificationConfidence: number;  // 0-100%

  // K-means Anomaly Detection
  anomalyScore: number;              // 0-100
  isAnomaly: boolean;
}
```

### Key Components Architecture

**Dashboard Layout** (`components/dashboard/motor-dashboard.tsx`):
- Main orchestrator component
- Real-time data streaming detection (5s threshold)
- Combines real-time + historical data (24h default)
- 4 status cards + 4 specialized charts + session statistics

**Motor Analytics Hooks** (`hooks/use-motor-analytics.ts`):
- `useMotorStatus()`: Current motor state, health, vibration
- `useVibrationTrends()`: RMS, peak, average, trend detection
- `useAnomalyDetection()`: Score tracking, consecutive anomaly detection
- `useMotorHealth()`: Composite health score (0-100) from classification (40%), anomaly (40%), vibration (20%)
- `useAccelerationAnalysis()`: Per-axis statistics, dominant axis detection

**State Management** (Zustand stores in `lib/stores/`):
- `auth-store.ts`: Firebase user auth with cookie-based sessions (7-day expiry)
- `alert-store.ts`: Alert configuration with localStorage persistence
- `settings-store.ts`: Theme + update interval with Firestore sync

### Firebase Integration Pattern

**Collections Structure**:
```
sensor_realtime/{deviceId}    # Single doc per device, 500ms updates
sensor_data/                  # Historical time-series, new doc every 500ms
```

**Real-time Listeners** (`hooks/use-sensor-data.ts`):
- Uses `onSnapshot()` for live updates
- Automatically handles reconnection
- Combines real-time + historical queries

**Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## ESP32 Integration

### Hardware Configuration
- **Microcontroller**: ESP32-WROOM-32
- **Sensor**: ADXL345 (SPI interface, 374 Hz sampling, ±16g range)
- **ML Platform**: Edge Impulse (Project ID: 813179)
- **TinyML Model**: Neural Network (399 → 20 → 8 → 2) + K-means (32 clusters)
- **Performance**: 59ms latency (58ms DSP + 1ms NN), 99.71% accuracy

### Edge Impulse Pipeline
```
Raw Data (accX, accY, accZ @ 374 Hz)
    ↓
DSP Block - Spectral Analysis (58ms)
    • FFT 256 points
    • Extract 399 features (RMS, spectral power bands, skewness, kurtosis)
    ↓
Dual Path:
    → Neural Network (1ms): Classification (idle/nominal)
    → K-means (< 1ms): Anomaly score (0-100)
    ↓
Firebase Upload (every 500ms)
```

### ESP32 Code Location
See `ESP32_GUIDE.md` for integration details and `esp32/motor_monitor/` for Arduino sketch (if available).

## Critical Development Patterns

### Adding New Motor Metric Cards
1. Create component in `components/` (e.g., `torque-card.tsx`)
2. Add calculation hook in `hooks/use-motor-analytics.ts`
3. Update `SensorData` type in `types/sensor.ts`
4. Integrate in `components/dashboard/motor-dashboard.tsx`

### Extending Alert System
1. Define new alert type in `lib/stores/alert-store.ts` (`ALERT_DEFAULTS`)
2. Update `Alert` interface with new type
3. Add monitoring logic in `components/alerts/alert-monitor.tsx`
4. Update settings UI in `app/alerts/page.tsx`

### Creating New Chart Components
Pattern from `components/motor-charts.tsx`:
```typescript
export function CustomChart({ data }: { data: SensorData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={processedData}>
            {/* Chart configuration */}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Firebase Data Queries
```typescript
// Real-time listener pattern
onSnapshot(
  query(
    collection(db, 'sensor_realtime'),
    where('deviceId', '==', deviceId)
  ),
  (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    // Handle data
  }
);

// Historical query pattern
const q = query(
  collection(db, 'sensor_data'),
  where('deviceId', '==', deviceId),
  orderBy('timestamp', 'desc'),
  limit(100)
);
```

## Project-Specific Conventions

### Color Coding Standards
- **Motor Status**: Idle (gray), Nominal (emerald), Error (red)
- **Anomaly Severity**: Low (<50, emerald), Medium (50-70, yellow), High (70-90, orange), Critical (90+, red)
- **Classification Confidence**: Use gradient from yellow (0%) to emerald (100%)

### Timestamp Handling
```typescript
// Firebase Timestamp to Date
const date = sensorData.timestamp?.toDate?.() || new Date();

// Display format
date.toLocaleTimeString() // "10:30:45 AM"
```

### Vibration Calculations
```typescript
// Magnitude: sqrt(accX² + accY² + accZ²)
const magnitude = calculateVibrationMagnitude(accX, accY, accZ);

// RMS over window
const rms = calculateRMS(dataArray);
```

### Health Score Formula
```typescript
healthScore =
  classificationConfidence * 0.4 +  // 40% weight
  (100 - anomalyScore) * 0.4 +      // 40% weight (inverted)
  vibrationScore * 0.2;              // 20% weight

// Status thresholds
critical: < 40
poor: 40-60
fair: 60-75
good: 75-90
excellent: 90-100
```

## Important File References

### Core Configuration
- `next.config.js`: Next.js config (image optimization)
- `tailwind.config.ts`: Custom theme, HSL color system
- `tsconfig.json`: TypeScript strict mode, path aliases `@/*`
- `package.json`: pnpm package manager, 72 dependencies

### Key Documentation
- `PROJECT_STATUS.md`: Detailed implementation status, ESP32 setup guide
- `MOTOR_MONITORING_PLAN.md`: Complete architecture, technical specs (Edge Impulse model details, Firebase structure, testing plan)
- `README.md`: Project overview, features, quick start

### Type Definitions
- `types/sensor.ts`: Core `SensorData` interface, helper functions
- All helper functions for colors, severity levels, calculations

### Custom Hooks
- `hooks/use-sensor-data.ts`: Firebase queries (real-time + historical)
- `hooks/use-motor-analytics.ts`: All analytics calculations
- `hooks/use-alerts.ts`: Alert monitoring logic

## Testing Workflow

### Dashboard Testing (Without ESP32)
```bash
pnpm dev
# Expected: Login → Dashboard shows "Waiting for Motor Data"
# No console errors, all UI renders correctly
```

### With Live ESP32 Data
1. ESP32 uploads to Firebase (500ms intervals)
2. Dashboard detects updates within 5 seconds
3. "Live" badge appears
4. Charts populate with real-time data
5. Anomalies trigger alerts if thresholds exceeded

### Firestore Security Rules (Development)
```javascript
// WARNING: Development only - tighten for production
match /sensor_data/{document=**} {
  allow read, write: if true;
}
match /sensor_realtime/{document=**} {
  allow read, write: if true;
}
```

## Common Issues

### No Data Displayed
- Check Firebase credentials in `.env.local`
- Verify ESP32 is uploading (check Firebase Console)
- Confirm Firestore security rules allow reads

### `[?]` in Citations (if working with report)
- Wrong project - that's the LaTeX thesis at `/home/ahmed/Downloads/master-pfe/my-pfe-report`
- See that project's CLAUDE.md for compilation instructions

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
pnpm build

# Type errors
pnpm tsc --noEmit
```

### Real-time Updates Not Working
- Check Firestore listeners in browser DevTools Network tab
- Verify Firebase SDK initialization in `config/firebase.ts`
- Ensure timestamp changes between readings (tracked in `motor-dashboard.tsx`)

## Path Aliases
All imports use `@/*` pattern:
```typescript
import { MotorDashboard } from '@/components/dashboard/motor-dashboard';
import { useSensorData } from '@/hooks/use-sensor-data';
import { db } from '@/config/firebase';
```

## Related Documentation Context

This dashboard visualizes data from the TinyML system documented in the academic thesis at `/home/ahmed/Downloads/master-pfe/my-pfe-report`. Key connections:

- **Edge Impulse Project 813179**: Neural Network + K-means model deployed on ESP32
- **Sampling Config**: 374 Hz (thesis specifies 390 Hz in some docs - verify actual hardware)
- **Window/Stride**: 2000ms window, 500ms stride (75% overlap)
- **Classification**: "idle" vs "nominal" motor states
- **Anomaly Detection**: K-means with 32 clusters, threshold typically 80

See thesis `CLAUDE.md` for LaTeX compilation and technical validation details.
