# Firebase Management Scripts

This directory contains utility scripts for managing your Firestore database during the transition to the motor monitoring system.

## Scripts Overview

### 1. `firebase-cleanup.ts`
Cleans up old sensor data from Firestore collections.

**Usage:**
```bash
# Dry run (see what would be deleted without actually deleting)
npx ts-node scripts/firebase-cleanup.ts --dry-run

# Clean all collections
npx ts-node scripts/firebase-cleanup.ts

# Clean specific collection
npx ts-node scripts/firebase-cleanup.ts --collection=sensor_data
npx ts-node scripts/firebase-cleanup.ts --collection=sensor_realtime
npx ts-node scripts/firebase-cleanup.ts --collection=sensor_history
```

**Options:**
- `--dry-run`: Preview what would be deleted without making changes
- `--collection=<name>`: Clean specific collection (sensor_data, sensor_realtime, sensor_history, or all)

**Safety Features:**
- 5-second countdown before deletion (in live mode)
- Batch processing to handle large datasets
- Dry run mode for safe testing

### 2. `firebase-validate-schema.ts`
Validates that Firestore data matches the new motor monitoring schema.

**Usage:**
```bash
# Validate all collections (10 documents each)
npx ts-node scripts/firebase-validate-schema.ts

# Validate specific collection
npx ts-node scripts/firebase-validate-schema.ts --collection=sensor_data

# Validate more documents
npx ts-node scripts/firebase-validate-schema.ts --limit=100
```

**Options:**
- `--collection=<name>`: Validate specific collection
- `--limit=<number>`: Number of documents to validate per collection (default: 10)

**Validation Checks:**
- Required fields presence
- Data types correctness
- Value ranges (e.g., confidence 0-100, anomaly score 0-100)
- Valid enum values (status, classification)
- Extra fields detection (old schema remnants)

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create `.env.local` with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Install ts-node (if not already installed):**
   ```bash
   npm install -D ts-node @types/node
   ```

## Recommended Workflow

### Initial Setup (Transitioning from Old Schema)

1. **Validate existing data:**
   ```bash
   npx ts-node scripts/firebase-validate-schema.ts
   ```
   This will show you what old fields exist and any schema issues.

2. **Dry run cleanup:**
   ```bash
   npx ts-node scripts/firebase-cleanup.ts --dry-run
   ```
   Preview what will be deleted.

3. **Clean old data:**
   ```bash
   npx ts-node scripts/firebase-cleanup.ts
   ```
   Remove old sensor data (temperature, humidity, etc.).

4. **Start ESP32 with new code:**
   Begin sending motor monitoring data (ADXL345).

5. **Validate new data:**
   ```bash
   npx ts-node scripts/firebase-validate-schema.ts
   ```
   Confirm ESP32 is sending correct schema.

### Regular Maintenance

**After ESP32 updates:**
```bash
# Validate new data format
npx ts-node scripts/firebase-validate-schema.ts --limit=20
```

**Monthly cleanup (if needed):**
```bash
# Clean old historical data (optional)
npx ts-node scripts/firebase-cleanup.ts --collection=sensor_history
```

## Expected Schema

The scripts validate against this motor monitoring schema:

```typescript
interface MotorSensorData {
  deviceId: string;
  timestamp: Timestamp;
  status: "active" | "inactive" | "error";

  // Acceleration (m/s² or g-force)
  accX: number;
  accY: number;
  accZ: number;

  // TinyML Classification
  classification: "idle" | "nominal";
  classificationConfidence: number; // 0-100

  // K-means Anomaly Detection
  anomalyScore: number; // 0-100
  isAnomaly: boolean;

  // Computed Metrics
  rms: number;
  vibrationMagnitude: number;
}
```

## Troubleshooting

### Error: "Firebase not initialized"
- Check that `.env.local` exists and contains valid Firebase credentials
- Ensure environment variables start with `NEXT_PUBLIC_`

### Error: "Permission denied"
- Update Firebase Security Rules to allow read/write access
- Example rules:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /sensor_realtime/{document} {
        allow read: if true;
        allow write: if request.auth != null;
      }
      match /sensor_data/{document} {
        allow read: if true;
        allow write: if request.auth != null;
      }
      match /sensor_history/{document} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
  ```

### Validation shows "Extra fields"
- These are likely old schema fields (temperature, humidity, etc.)
- Run cleanup script to remove old data
- Or manually update documents to new schema

### Script hangs or is very slow
- Large collections may take time
- Use `--limit` flag to validate fewer documents
- Cleanup script uses batching to handle large datasets

## Safety Notes

⚠️ **Important:**
- Always run with `--dry-run` first to preview changes
- Backup your Firestore data before running cleanup (use Firebase Console export)
- Test on a development Firebase project first
- The cleanup script has a 5-second countdown in live mode - press Ctrl+C to cancel

## Support

For issues or questions:
1. Check Firebase Console for actual data structure
2. Review Edge Impulse documentation for correct data format
3. Verify ESP32 code is sending proper JSON structure
4. Check browser console for Next.js errors

## Next Steps

After cleaning and validating:
1. Update ESP32 code to send motor monitoring data
2. Test real-time data flow in dashboard
3. Configure alert thresholds in `config/firebase-constants.ts`
4. Set up Firebase indexes if querying is slow
