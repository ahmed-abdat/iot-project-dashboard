import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { SensorData, SensorStats } from "@/types/sensor";
import { COLLECTIONS } from "@/config/firebase-constants";
import { getSensorStats } from "@/app/actions/sensor-crud";

// Helper function to convert Firestore doc to SensorData
function convertToSensorData(doc: QueryDocumentSnapshot) {
  const data = doc.data();
  return {
    deviceId: data.deviceId,
    temperature: data.temperature,
    humidity: data.humidity,
    gasLevel: data.gasLevel,
    distance: data.distance,
    timestamp: data.timestamp,
    status: data.status,
  } as SensorData;
}

// Hook for real-time sensor data
export function useSensorData(deviceId?: string) {
  const [data, setData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const baseQuery = query(
      collection(db, COLLECTIONS.SENSOR_REALTIME),
      where("status", "==", "active")
    );

    const q = deviceId
      ? query(baseQuery, where("deviceId", "==", deviceId))
      : baseQuery;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sensorData = snapshot.docs.map(convertToSensorData);
        setData(sensorData);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching sensor data:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId]);

  return { data, isLoading, error };
}

// Hook for sensor statistics
export function useSensorStats() {
  const [stats, setStats] = useState<SensorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getSensorStats();
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        console.error("Error fetching sensor stats:", err);
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch stats")
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  return { stats, isLoading, error };
}

// Hook for historical sensor data
export function useSensorHistory(deviceId?: string, hours = 24) {
  const [data, setData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const baseQuery = query(
      collection(db, COLLECTIONS.SENSOR_DATA),
      where("timestamp", ">=", Timestamp.fromDate(startTime)),
      orderBy("timestamp", "desc")
    );

    const q = deviceId
      ? query(baseQuery, where("deviceId", "==", deviceId))
      : baseQuery;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const historyData = snapshot.docs.map(convertToSensorData);
        setData(historyData);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching history data:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId, hours]);

  return { data, isLoading, error };
}
