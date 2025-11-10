/**
 * Firebase Cleanup Script
 *
 * This script helps clean up old sensor data and prepare Firestore
 * for the new motor monitoring schema.
 *
 * Usage:
 *   npx ts-node scripts/firebase-cleanup.ts
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --collection: Specify collection to clean (sensor_data, sensor_realtime, sensor_history, or all)
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  query,
  limit as firestoreLimit,
} from "firebase/firestore";

// Firebase configuration (replace with your actual config or use env vars)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const collectionArg = args.find((arg) => arg.startsWith("--collection="));
const targetCollection = collectionArg
  ? collectionArg.split("=")[1]
  : "all";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  SENSOR_DATA: "sensor_data",
  SENSOR_HISTORY: "sensor_history",
  SENSOR_REALTIME: "sensor_realtime",
};

/**
 * Delete all documents in a collection in batches
 */
async function cleanCollection(collectionName: string): Promise<number> {
  console.log(`\n📋 Cleaning collection: ${collectionName}`);

  const collectionRef = collection(db, collectionName);
  let totalDeleted = 0;
  let batchCount = 0;

  try {
    // Get all documents in batches of 500 (Firestore limit)
    let hasMore = true;

    while (hasMore) {
      const q = query(collectionRef, firestoreLimit(500));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      if (isDryRun) {
        console.log(`  [DRY RUN] Would delete ${snapshot.size} documents`);
        totalDeleted += snapshot.size;
        hasMore = false; // In dry run, just count once
      } else {
        // Delete in batches
        const batch = writeBatch(db);
        snapshot.docs.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });

        await batch.commit();
        batchCount++;
        totalDeleted += snapshot.size;

        console.log(
          `  ✅ Batch ${batchCount}: Deleted ${snapshot.size} documents (Total: ${totalDeleted})`
        );

        // If we got fewer than 500, we're done
        if (snapshot.size < 500) {
          hasMore = false;
        }
      }
    }

    console.log(
      `✅ ${isDryRun ? "[DRY RUN] Would delete" : "Deleted"} ${totalDeleted} documents from ${collectionName}`
    );
    return totalDeleted;
  } catch (error) {
    console.error(`❌ Error cleaning ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Main cleanup function
 */
async function runCleanup() {
  console.log("🧹 Firebase Cleanup Script");
  console.log("==========================");
  console.log(`Mode: ${isDryRun ? "DRY RUN (no actual deletions)" : "LIVE (will delete data)"}`);
  console.log(`Target: ${targetCollection}`);
  console.log("");

  if (!isDryRun) {
    console.warn("⚠️  WARNING: This will permanently delete data!");
    console.warn("⚠️  Press Ctrl+C within 5 seconds to cancel...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  let totalDeleted = 0;

  try {
    if (targetCollection === "all") {
      // Clean all collections
      totalDeleted += await cleanCollection(COLLECTIONS.SENSOR_DATA);
      totalDeleted += await cleanCollection(COLLECTIONS.SENSOR_HISTORY);
      totalDeleted += await cleanCollection(COLLECTIONS.SENSOR_REALTIME);
    } else {
      // Clean specific collection
      const collectionName = COLLECTIONS[targetCollection.toUpperCase() as keyof typeof COLLECTIONS];
      if (!collectionName) {
        console.error(`❌ Unknown collection: ${targetCollection}`);
        console.log(
          `Valid collections: ${Object.keys(COLLECTIONS).map((k) => k.toLowerCase()).join(", ")}`
        );
        process.exit(1);
      }
      totalDeleted += await cleanCollection(collectionName);
    }

    console.log("\n✅ Cleanup completed successfully!");
    console.log(`📊 Total documents ${isDryRun ? "to be deleted" : "deleted"}: ${totalDeleted}`);

    if (isDryRun) {
      console.log("\n💡 Run without --dry-run to actually delete the data");
    } else {
      console.log("\n✅ Your Firestore is now clean and ready for motor monitoring data!");
    }
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  }
}

// Run the cleanup
runCleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
