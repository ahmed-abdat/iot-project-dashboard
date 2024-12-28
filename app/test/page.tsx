"use client";

import { useState, useEffect, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import { createSensorData } from "@/app/actions/sensor-crud";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { SENSOR_ERROR_VALUE } from "@/types/sensor";

export default function TestPage() {
  const [deviceId, setDeviceId] = useState("esp32-001");
  const [lastData, setLastData] = useState<any>(null);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to generate random sensor data with possible errors
  const generateSensorData = useCallback(() => {
    // Simulate random sensor errors (10% chance for each sensor)
    const simulateError = () =>
      Math.random() < 0.1 ? SENSOR_ERROR_VALUE : null;

    return {
      deviceId,
      temperature:
        simulateError() ?? Number((20 + Math.random() * 10).toFixed(1)),
      humidity: simulateError() ?? Number((40 + Math.random() * 30).toFixed(1)),
      pressure:
        simulateError() ?? Number((1000 + Math.random() * 100).toFixed(1)),
      distance:
        simulateError() ?? Number((50 + Math.random() * 200).toFixed(1)),
      timestamp: Timestamp.now(),
      status: "active" as const,
      errors: {
        temperature: simulateError() !== null,
        humidity: simulateError() !== null,
        pressure: simulateError() !== null,
        distance: simulateError() !== null,
      },
    };
  }, [deviceId]);

  // Function to format the displayed data
  const formatData = useCallback(
    (data: any) => ({
      deviceId: data.deviceId,
      timestamp: format(data.timestamp.toDate(), "HH:mm:ss"),
      readings: {
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        distance: data.distance,
      },
      errors: data.errors,
    }),
    []
  );

  // Function to generate and send data
  const generateAndSendData = useCallback(async () => {
    try {
      setError(null);
      const data = generateSensorData();
      await createSensorData(data);
      setLastData(formatData(data));
    } catch (err) {
      console.error("Error generating data:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to generate data")
      );
    }
  }, [generateSensorData, formatData]);

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
