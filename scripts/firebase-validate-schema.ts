/**
 * Firebase Schema Validation Script
 *
 * This script validates that the Firestore data matches the new motor monitoring schema.
 * It checks for:
 * - Required fields presence
 * - Data types
 * - Value ranges
 * - Schema compliance
 *
 * Usage:
 *   npx ts-node scripts/firebase-validate-schema.ts
 *
 * Options:
 *   --collection: Specify collection to validate (sensor_data, sensor_realtime, sensor_history, or all)
 *   --limit: Number of documents to validate per collection (default: 10)
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  limit as firestoreLimit,
  Timestamp,
} from "firebase/firestore";

// Firebase configuration
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
const collectionArg = args.find((arg) => arg.startsWith("--collection="));
const targetCollection = collectionArg ? collectionArg.split("=")[1] : "all";
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const docLimit = limitArg ? parseInt(limitArg.split("=")[1]) : 10;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  SENSOR_DATA: "sensor_data",
  SENSOR_HISTORY: "sensor_history",
  SENSOR_REALTIME: "sensor_realtime",
};

// Expected schema for motor monitoring data
const EXPECTED_SCHEMA = {
  deviceId: "string",
  timestamp: "timestamp",
  status: "string", // active | inactive | error
  accX: "number",
  accY: "number",
  accZ: "number",
  classification: "string", // idle | nominal
  classificationConfidence: "number", // 0-100
  anomalyScore: "number", // 0-100
  isAnomaly: "boolean",
  rms: "number",
  vibrationMagnitude: "number",
};

type ValidationIssue = {
  documentId: string;
  field: string;
  issue: string;
  severity: "error" | "warning";
};

/**
 * Validate a single document against the schema
 */
function validateDocument(docId: string, data: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for required fields
  for (const [field, expectedType] of Object.entries(EXPECTED_SCHEMA)) {
    if (!(field in data)) {
      issues.push({
        documentId: docId,
        field,
        issue: `Missing required field`,
        severity: "error",
      });
      continue;
    }

    const value = data[field];

    // Check data type
    if (expectedType === "timestamp") {
      if (!(value instanceof Timestamp) && typeof value !== "object") {
        issues.push({
          documentId: docId,
          field,
          issue: `Expected Timestamp, got ${typeof value}`,
          severity: "error",
        });
      }
    } else if (expectedType === "number") {
      if (typeof value !== "number" || isNaN(value)) {
        issues.push({
          documentId: docId,
          field,
          issue: `Expected number, got ${typeof value}`,
          severity: "error",
        });
      }
    } else if (expectedType === "string") {
      if (typeof value !== "string") {
        issues.push({
          documentId: docId,
          field,
          issue: `Expected string, got ${typeof value}`,
          severity: "error",
        });
      }
    } else if (expectedType === "boolean") {
      if (typeof value !== "boolean") {
        issues.push({
          documentId: docId,
          field,
          issue: `Expected boolean, got ${typeof value}`,
          severity: "error",
        });
      }
    }

    // Validate specific field ranges and values
    if (field === "status" && typeof value === "string") {
      if (!["active", "inactive", "error"].includes(value)) {
        issues.push({
          documentId: docId,
          field,
          issue: `Invalid status value: ${value}. Expected: active, inactive, or error`,
          severity: "error",
        });
      }
    }

    if (field === "classification" && typeof value === "string") {
      if (!["idle", "nominal"].includes(value)) {
        issues.push({
          documentId: docId,
          field,
          issue: `Invalid classification: ${value}. Expected: idle or nominal`,
          severity: "error",
        });
      }
    }

    if (field === "classificationConfidence" && typeof value === "number") {
      if (value < 0 || value > 100) {
        issues.push({
          documentId: docId,
          field,
          issue: `Confidence out of range: ${value}. Expected: 0-100`,
          severity: "warning",
        });
      }
    }

    if (field === "anomalyScore" && typeof value === "number") {
      if (value < 0 || value > 100) {
        issues.push({
          documentId: docId,
          field,
          issue: `Anomaly score out of range: ${value}. Expected: 0-100`,
          severity: "warning",
        });
      }
    }
  }

  // Check for extra fields (not in schema)
  for (const field of Object.keys(data)) {
    if (!(field in EXPECTED_SCHEMA)) {
      issues.push({
        documentId: docId,
        field,
        issue: `Extra field not in schema (may be old data)`,
        severity: "warning",
      });
    }
  }

  return issues;
}

/**
 * Validate a collection
 */
async function validateCollection(collectionName: string): Promise<{
  total: number;
  valid: number;
  issues: ValidationIssue[];
}> {
  console.log(`\n📋 Validating collection: ${collectionName}`);

  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, firestoreLimit(docLimit));

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`  ℹ️  Collection is empty`);
      return { total: 0, valid: 0, issues: [] };
    }

    let validCount = 0;
    const allIssues: ValidationIssue[] = [];

    snapshot.forEach((doc) => {
      const docIssues = validateDocument(doc.id, doc.data());
      if (docIssues.length === 0) {
        validCount++;
      } else {
        allIssues.push(...docIssues);
      }
    });

    const total = snapshot.size;
    console.log(`  📊 Validated ${total} documents`);
    console.log(`  ✅ Valid: ${validCount}`);
    console.log(`  ⚠️  Issues: ${allIssues.length}`);

    return { total, valid: validCount, issues: allIssues };
  } catch (error) {
    console.error(`❌ Error validating ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Main validation function
 */
async function runValidation() {
  console.log("🔍 Firebase Schema Validation");
  console.log("============================");
  console.log(`Target: ${targetCollection}`);
  console.log(`Document limit per collection: ${docLimit}`);
  console.log("");

  const results: Record<
    string,
    { total: number; valid: number; issues: ValidationIssue[] }
  > = {};

  try {
    if (targetCollection === "all") {
      // Validate all collections
      results[COLLECTIONS.SENSOR_DATA] = await validateCollection(
        COLLECTIONS.SENSOR_DATA
      );
      results[COLLECTIONS.SENSOR_HISTORY] = await validateCollection(
        COLLECTIONS.SENSOR_HISTORY
      );
      results[COLLECTIONS.SENSOR_REALTIME] = await validateCollection(
        COLLECTIONS.SENSOR_REALTIME
      );
    } else {
      // Validate specific collection
      const collectionName =
        COLLECTIONS[targetCollection.toUpperCase() as keyof typeof COLLECTIONS];
      if (!collectionName) {
        console.error(`❌ Unknown collection: ${targetCollection}`);
        console.log(
          `Valid collections: ${Object.keys(COLLECTIONS)
            .map((k) => k.toLowerCase())
            .join(", ")}`
        );
        process.exit(1);
      }
      results[collectionName] = await validateCollection(collectionName);
    }

    // Print summary
    console.log("\n📊 Validation Summary");
    console.log("=====================");

    let totalDocs = 0;
    let totalValid = 0;
    let totalIssues = 0;

    for (const [collectionName, result] of Object.entries(results)) {
      totalDocs += result.total;
      totalValid += result.valid;
      totalIssues += result.issues.length;
    }

    console.log(`Total documents validated: ${totalDocs}`);
    console.log(`Valid documents: ${totalValid} (${totalDocs > 0 ? ((totalValid / totalDocs) * 100).toFixed(1) : 0}%)`);
    console.log(`Total issues found: ${totalIssues}`);

    // Print detailed issues
    if (totalIssues > 0) {
      console.log("\n⚠️  Detailed Issues:");
      console.log("===================");

      for (const [collectionName, result] of Object.entries(results)) {
        if (result.issues.length > 0) {
          console.log(`\n📁 ${collectionName}:`);

          // Group by document
          const issuesByDoc: Record<string, ValidationIssue[]> = {};
          result.issues.forEach((issue) => {
            if (!issuesByDoc[issue.documentId]) {
              issuesByDoc[issue.documentId] = [];
            }
            issuesByDoc[issue.documentId].push(issue);
          });

          for (const [docId, issues] of Object.entries(issuesByDoc)) {
            console.log(`\n  Document: ${docId}`);
            issues.forEach((issue) => {
              const icon = issue.severity === "error" ? "❌" : "⚠️ ";
              console.log(`    ${icon} ${issue.field}: ${issue.issue}`);
            });
          }
        }
      }

      console.log("\n💡 Recommendations:");
      console.log("- Run firebase-cleanup.ts to remove old schema data");
      console.log("- Ensure ESP32 is sending data in the new format");
      console.log("- Check Firebase security rules for proper field validation");
    } else {
      console.log("\n✅ All documents are valid!");
      console.log("🎉 Your schema is properly configured for motor monitoring!");
    }
  } catch (error) {
    console.error("\n❌ Validation failed:", error);
    process.exit(1);
  }
}

// Run the validation
runValidation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
