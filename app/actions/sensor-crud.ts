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

// Get sensor statistics
export async function getSensorStats(): Promise<SensorStats> {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.SENSOR_DATA),
        where("status", "==", "active"),
        orderBy("timestamp", "desc"),
        limit(100)
      )
    );

    const data = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SensorData[];

    const totalReadings = data.length;

    if (totalReadings === 0) {
      return {
        avgTemperature: 0,
        avgHumidity: 0,
        avgPressure: 0,
        avgDistance: 0,
        totalReadings: 0,
        activeDevices: 0,
        lastUpdate: Timestamp.now(),
      };
    }

    const uniqueDevices = new Set(data.map((d) => d.deviceId));

    // Calculate averages
    const totals = data.reduce(
      (acc, curr) => ({
        temperature: acc.temperature + curr.temperature,
        humidity: acc.humidity + curr.humidity,
        pressure: acc.pressure + curr.pressure,
        distance: acc.distance + curr.distance,
      }),
      { temperature: 0, humidity: 0, pressure: 0, distance: 0 }
    );

    return {
      avgTemperature: totals.temperature / totalReadings,
      avgHumidity: totals.humidity / totalReadings,
      avgPressure: totals.pressure / totalReadings,
      avgDistance: totals.distance / totalReadings,
      totalReadings,
      activeDevices: uniqueDevices.size,
      lastUpdate: Timestamp.now(),
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
      data: querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SensorData[],
      lastDoc,
    };
  } catch (error) {
    console.error("Error listing sensor data:", error);
    throw error;
  }
}
