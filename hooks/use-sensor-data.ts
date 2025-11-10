import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { SensorData, SensorStats } from "@/types/sensor";
import { COLLECTIONS } from "@/config/firebase-constants";
import { getSensorStats } from "@/app/actions/sensor-crud";
import { useSettingsStore } from "@/lib/stores/settings-store";

// Helper function to convert Firestore doc to SensorData
function convertToSensorData(doc: QueryDocumentSnapshot) {
  const data = doc.data();
  return {
    deviceId: data.deviceId,
    timestamp: data.timestamp,
    status: data.status,

    // Raw acceleration
    accX: data.accX,
    accY: data.accY,
    accZ: data.accZ,

    // TinyML classification
    classification: data.classification,
    classificationConfidence: data.classificationConfidence,

    // Anomaly detection
    anomalyScore: data.anomalyScore,
    isAnomaly: data.isAnomaly,
  } as SensorData;
}

// Hook for real-time sensor data
export function useSensorData(deviceId?: string) {
  const [data, setData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const updateInterval = useSettingsStore(
    (state) => state.settings.updateInterval
  );

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

    // Real-time mode (updateInterval === 0)
    if (updateInterval === 0) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const sensorData = snapshot.docs.map(convertToSensorData);
          console.log('🔥 Real-time data received:', {
            count: sensorData.length,
            collection: 'sensor_realtime',
            firstItem: sensorData[0] ? {
              deviceId: sensorData[0].deviceId,
              timestamp: sensorData[0].timestamp,
              hasToDate: typeof sensorData[0].timestamp?.toDate === 'function',
            } : null,
          });
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
    }

    // Polling mode (updateInterval > 0)
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const sensorData = snapshot.docs.map(convertToSensorData);
        console.log('🔄 Polling data received:', {
          count: sensorData.length,
          collection: 'sensor_realtime',
        });
        setData(sensorData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching sensor data:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, updateInterval * 1000);

    return () => clearInterval(intervalId);
  }, [deviceId, updateInterval]);

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
  const updateInterval = useSettingsStore(
    (state) => state.settings.updateInterval
  );

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

    // Real-time mode (updateInterval === 0)
    if (updateInterval === 0) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const historyData = snapshot.docs.map(convertToSensorData);
          console.log('📚 Historical data received:', {
            count: historyData.length,
            collection: 'sensor_data',
            queryHours: hours,
          });
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
    }

    // Polling mode (updateInterval > 0)
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const historyData = snapshot.docs.map(convertToSensorData);
        console.log('📚 Historical data (polling):', {
          count: historyData.length,
          collection: 'sensor_data',
          queryHours: hours,
        });
        setData(historyData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching history data:", err);
        setError(err as Error);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling interval
    const intervalId = setInterval(fetchData, updateInterval * 1000);

    return () => clearInterval(intervalId);
  }, [deviceId, hours, updateInterval]);

  return { data, isLoading, error };
}
