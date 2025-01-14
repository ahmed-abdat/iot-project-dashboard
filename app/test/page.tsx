"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { createSensorData } from "@/app/actions/sensor-crud";
import { Timestamp } from "firebase/firestore";
import type { SensorStatus } from "@/types/sensor";

// Interface for the raw sensor data format
interface RawSensorData {
  deviceId: string;
  distance: number;
  gasLevel: number;
  humidity: number;
  status: SensorStatus;
  temperature: number;
  timestamp: string;
}

export default function TestPage() {
  const [deviceId, setDeviceId] = useState("esp32-001");
  const [lastData, setLastData] = useState<RawSensorData | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to generate sensor data in the exact format shown
  const generateSensorData = useCallback(() => {
    const now = new Date();
    return {
      deviceId,
      distance: Number((Math.random() * 20).toFixed(3)), // Random distance between 0-20
      gasLevel: Number((200 + Math.random() * 9800).toFixed(0)), // Random gas level between 200-10000 ppm (typical MQ-4 range)
      humidity: Number((60 + Math.random() * 20).toFixed(1)), // Random humidity between 60-80
      status: "active" as const,
      temperature: Number((15 + Math.random() * 5).toFixed(1)), // Random temperature between 15-20
      timestamp: format(now, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"), // ISO 8601 format
    };
  }, [deviceId]);

  // Function to convert data for Firebase
  const convertToFirebaseData = (data: RawSensorData) => {
    return {
      ...data,
      timestamp: Timestamp.now(), // Use current timestamp directly
    };
  };

  // Function to generate and send data
  const generateAndSendData = useCallback(async () => {
    try {
      setError(null);
      const rawData = generateSensorData();
      const firebaseData = convertToFirebaseData(rawData);
      await createSensorData(firebaseData);
      setLastData(rawData); // Store the raw format for display
    } catch (err) {
      console.error("Error generating data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to generate data")
      );
    }
  }, [generateSensorData]);

  // Auto-generate data every 5 seconds
  useEffect(() => {
    if (!autoGenerate) return;

    const interval = setInterval(generateAndSendData, 5000);
    return () => clearInterval(interval);
  }, [autoGenerate, generateAndSendData]);

  return (
    <PageContainer
      title="Test Data Generator"
      description="Generate test sensor data with simulated errors"
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Device ID"
              />
              <Button onClick={generateAndSendData}>Generate Data</Button>
              <Button
                variant={autoGenerate ? "destructive" : "secondary"}
                onClick={() => setAutoGenerate(!autoGenerate)}
              >
                {autoGenerate ? "Stop Auto Generate" : "Start Auto Generate"}
              </Button>
            </div>

            {error && (
              <div className="text-sm text-destructive">
                Error: {error.message}
              </div>
            )}

            {lastData && (
              <div className="space-y-2">
                <h3 className="font-medium">Last Generated Data:</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-auto">
                  {JSON.stringify(lastData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
