"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/page-container";
import { useState, useEffect, useCallback } from "react";
import { Timestamp } from "firebase/firestore";
import type { ReadingQuality } from "@/types/sensor";
import { createSensorData } from "@/app/actions/sensor-crud";
import { format } from "date-fns";

export default function TestPage() {
  const [deviceId, setDeviceId] = useState("esp32-001");
  const [interval, setInterval] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [previewData, setPreviewData] = useState("");

  // Function to generate random sensor data
  const generateSensorData = useCallback(() => {
    // Generate base readings
    const temperature = 20 + Math.random() * 10;
    const humidity = 40 + Math.random() * 30;
    const pressure = 1000 + Math.random() * 100;

    // Determine reading quality based on ranges
    const getQuality = (
      value: number,
      min: number,
      max: number
    ): ReadingQuality => {
      if (value < min || value > max) return "error";
      const buffer = (max - min) * 0.1;
      if (value < min + buffer || value > max - buffer) return "warning";
      return "good";
    };

    return {
      deviceId,
      temperature: Number(temperature.toFixed(1)),
      humidity: Number(humidity.toFixed(1)),
      pressure: Number(pressure.toFixed(1)),
      timestamp: Timestamp.now(),
      status: "active" as const,
      readingQuality: {
        temperature: getQuality(temperature, 15, 35),
        humidity: getQuality(humidity, 30, 70),
        pressure: getQuality(pressure, 950, 1050),
      },
    };
  }, [deviceId]);

  // Format preview info
  const formatPreviewInfo = useCallback(
    (data: ReturnType<typeof generateSensorData>) => ({
      deviceId: data.deviceId,
      timestamp: format(data.timestamp.toDate(), "HH:mm:ss"),
      readings: {
        temperature: {
          value: data.temperature,
          unit: "°C",
          quality: data.readingQuality.temperature,
        },
        humidity: {
          value: data.humidity,
          unit: "%",
          quality: data.readingQuality.humidity,
        },
        pressure: {
          value: data.pressure,
          unit: "hPa",
          quality: data.readingQuality.pressure,
        },
      },
    }),
    []
  );

  // Function to send a single reading
  const sendReading = useCallback(async () => {
    try {
      setIsCreating(true);
      const data = generateSensorData();
      // Format preview with essential data only
      const previewInfo = formatPreviewInfo(data);
      setPreviewData(JSON.stringify(previewInfo, null, 2));
      await createSensorData(data);
      console.log("Sensor data sent successfully:", data);
    } catch (error) {
      console.error("Error sending sensor data:", error);
    } finally {
      setIsCreating(false);
    }
  }, [generateSensorData, formatPreviewInfo]);

  // Update preview data every second when not sending
  useEffect(() => {
    if (!isRunning && !isCreating) {
      const updatePreview = () => {
        const data = generateSensorData();
        const previewInfo = formatPreviewInfo(data);
        setPreviewData(JSON.stringify(previewInfo, null, 2));
      };

      updatePreview(); // Initial update
      const previewInterval = window.setInterval(updatePreview, 1000);

      return () => window.clearInterval(previewInterval);
    }
  }, [isRunning, isCreating, generateSensorData, formatPreviewInfo]);

  // Handle continuous readings with useEffect
  useEffect(() => {
    let intervalId: number;

    if (isRunning) {
      // Send initial reading
      void sendReading();
      // Set up interval
      intervalId = window.setInterval(
        () => void sendReading(),
        interval * 1000
      );
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isRunning, interval, sendReading]);

  return (
    <PageContainer
      title="ESP32 Simulator"
      description="Test sending sensor data to Firestore"
    >
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Device ID</label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Enter device ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Interval (seconds)</label>
              <Input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                disabled={isRunning}
              />
            </div>

            <div className="space-x-4">
              <Button
                onClick={() => void sendReading()}
                disabled={isCreating || isRunning}
              >
                Send Single Reading
              </Button>

              <Button
                onClick={() => setIsRunning(!isRunning)}
                variant={isRunning ? "destructive" : "default"}
              >
                {isRunning ? "Stop Continuous" : "Start Continuous"}
              </Button>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">
                Last Generated Values:
              </h3>
              <pre className="bg-secondary p-4 rounded-lg overflow-auto max-h-[200px]">
                {previewData}
              </pre>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}