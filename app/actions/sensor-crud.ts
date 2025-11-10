import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  SensorData,
  SensorDataInput,
  SensorFilters,
  SensorStats,
  PaginationParams,
} from "@/types/sensor";
import { COLLECTIONS } from "@/config/firebase-constants";
import { isSensorError, SENSOR_ERROR_VALUE } from "@/types/sensor";

// Create new sensor data
export async function createSensorData(data: SensorDataInput): Promise<string> {
  try {
    // Add to sensor_data collection for history
    const docRef = await addDoc(collection(db, COLLECTIONS.SENSOR_DATA), {
      ...data,
      timestamp: data.timestamp || Timestamp.now(),
    });

    // Update sensor_realtime collection with latest reading
    await setDoc(
      doc(db, COLLECTIONS.SENSOR_REALTIME, data.deviceId),
      {
        ...data,
        timestamp: data.timestamp || Timestamp.now(),
      },
      { merge: true }
    );

    return docRef.id;
  } catch (error) {
    console.error("Error creating sensor data:", error);
    throw error;
  }
}

// Get sensor statistics for motor monitoring
export async function getSensorStats(): Promise<SensorStats> {
  try {
    const q = query(
      collection(db, COLLECTIONS.SENSOR_DATA),
      where("status", "==", "active"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => {
      const docData = doc.data() as Omit<SensorData, "id">;
      return {
        id: doc.id,
        ...docData,
      } as SensorData;
    });

    if (!data.length) {
      return {
        avgAnomalyScore: 0,
        avgVibrationMagnitude: 0,
        totalReadings: 0,
        totalAnomalies: 0,
        activeDevices: 0,
        lastUpdate: Timestamp.now(),
        idleCount: 0,
        nominalCount: 0,
        uptimePercentage: 0,
      };
    }

    const uniqueDevices = new Set(data.map((d) => d.deviceId));
    const totalReadings = data.length;

    // Calculate motor-specific metrics
    const totals = data.reduce(
      (acc, curr) => {
        const vibrationMagnitude = Math.sqrt(
          curr.accX * curr.accX + curr.accY * curr.accY + curr.accZ * curr.accZ
        );
        return {
          anomalyScore: acc.anomalyScore + curr.anomalyScore,
          vibrationMagnitude: acc.vibrationMagnitude + vibrationMagnitude,
          anomalyCount: acc.anomalyCount + (curr.isAnomaly ? 1 : 0),
          idleCount: acc.idleCount + (curr.classification === "idle" ? 1 : 0),
          nominalCount: acc.nominalCount + (curr.classification === "nominal" ? 1 : 0),
        };
      },
      {
        anomalyScore: 0,
        vibrationMagnitude: 0,
        anomalyCount: 0,
        idleCount: 0,
        nominalCount: 0,
      }
    );

    return {
      avgAnomalyScore: totals.anomalyScore / totalReadings,
      avgVibrationMagnitude: totals.vibrationMagnitude / totalReadings,
      totalReadings,
      totalAnomalies: totals.anomalyCount,
      activeDevices: uniqueDevices.size,
      lastUpdate: Timestamp.now(),
      idleCount: totals.idleCount,
      nominalCount: totals.nominalCount,
      uptimePercentage: (totals.nominalCount / totalReadings) * 100,
    };
  } catch (error) {
    console.error("Error getting sensor stats:", error);
    throw error;
  }
}

// List sensor data with filters and pagination
export async function listSensorData(
  filters?: SensorFilters,
  pagination?: PaginationParams
): Promise<{ data: SensorData[]; lastDoc: DocumentSnapshot | null }> {
  try {
    let baseQuery = query(
      collection(db, COLLECTIONS.SENSOR_DATA),
      orderBy("timestamp", "desc")
    );

    if (filters?.deviceId) {
      baseQuery = query(baseQuery, where("deviceId", "==", filters.deviceId));
    }
    if (filters?.status) {
      baseQuery = query(baseQuery, where("status", "==", filters.status));
    }
    if (filters?.startDate) {
      baseQuery = query(
        baseQuery,
        where("timestamp", ">=", Timestamp.fromDate(filters.startDate))
      );
    }
    if (filters?.endDate) {
      baseQuery = query(
        baseQuery,
        where("timestamp", "<=", Timestamp.fromDate(filters.endDate))
      );
    }

    const pageSize = pagination?.pageSize || 100;
    baseQuery = query(baseQuery, limit(pageSize));

    if (pagination?.lastDocumentId) {
      const lastDoc = await getDoc(
        doc(db, COLLECTIONS.SENSOR_DATA, pagination.lastDocumentId)
      );
      if (lastDoc.exists()) {
        baseQuery = query(baseQuery, startAfter(lastDoc));
      }
    }

    const querySnapshot = await getDocs(baseQuery);
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return {
      data: querySnapshot.docs.map((doc) => {
        const docData = doc.data() as Omit<SensorData, "id">;
        return {
          id: doc.id,
          ...docData,
        } as SensorData;
      }),
      lastDoc,
    };
  } catch (error) {
    console.error("Error listing sensor data:", error);
    throw error;
  }
}
