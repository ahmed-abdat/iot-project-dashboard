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

// Get sensor statistics
export async function getSensorStats(): Promise<SensorStats> {
  try {
    const q = query(
      collection(db, COLLECTIONS.SENSOR_DATA),
      where("status", "==", "active"),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SensorData[];

    if (!data.length) {
      return {
        avgTemperature: 0,
        avgHumidity: 0,
        avgPressure: 0,
        avgDistance: 0,
        totalReadings: 0,
        activeDevices: 0,
        lastUpdate: Timestamp.now(),
        errorCounts: {
          temperature: 0,
          humidity: 0,
          pressure: 0,
          distance: 0,
        },
      };
    }

    const uniqueDevices = new Set(data.map((d) => d.deviceId));
    const totalReadings = data.length;

    // Count errors
    const errorCounts = data.reduce(
      (acc, curr) => ({
        temperature:
          acc.temperature + (isSensorError(curr.temperature) ? 1 : 0),
        humidity: acc.humidity + (isSensorError(curr.humidity) ? 1 : 0),
        pressure: acc.pressure + (isSensorError(curr.pressure) ? 1 : 0),
        distance: acc.distance + (isSensorError(curr.distance) ? 1 : 0),
      }),
      { temperature: 0, humidity: 0, pressure: 0, distance: 0 }
    );

    // Calculate averages excluding error values
    const totals = data.reduce(
      (acc, curr) => ({
        temperature:
          acc.temperature +
          (isSensorError(curr.temperature) ? 0 : curr.temperature),
        humidity:
          acc.humidity + (isSensorError(curr.humidity) ? 0 : curr.humidity),
        pressure:
          acc.pressure + (isSensorError(curr.pressure) ? 0 : curr.pressure),
        distance:
          acc.distance + (isSensorError(curr.distance) ? 0 : curr.distance),
        validTemperature:
          acc.validTemperature + (isSensorError(curr.temperature) ? 0 : 1),
        validHumidity:
          acc.validHumidity + (isSensorError(curr.humidity) ? 0 : 1),
        validPressure:
          acc.validPressure + (isSensorError(curr.pressure) ? 0 : 1),
        validDistance:
          acc.validDistance + (isSensorError(curr.distance) ? 0 : 1),
      }),
      {
        temperature: 0,
        humidity: 0,
        pressure: 0,
        distance: 0,
        validTemperature: 0,
        validHumidity: 0,
        validPressure: 0,
        validDistance: 0,
      }
    );

    return {
      avgTemperature: totals.validTemperature
        ? totals.temperature / totals.validTemperature
        : 0,
      avgHumidity: totals.validHumidity
        ? totals.humidity / totals.validHumidity
        : 0,
      avgPressure: totals.validPressure
        ? totals.pressure / totals.validPressure
        : 0,
      avgDistance: totals.validDistance
        ? totals.distance / totals.validDistance
        : 0,
      totalReadings,
      activeDevices: uniqueDevices.size,
      lastUpdate: Timestamp.now(),
      errorCounts,
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
