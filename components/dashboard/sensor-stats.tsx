"use client";

import { Thermometer, Droplets, Wind, Activity, Ruler } from "lucide-react";
import { SensorCard } from "@/components/sensor-card";
import type { SensorData } from "@/types/sensor";
import { useSettingsStore } from "@/lib/stores/settings-store";
import {
  convertTemperature,
  convertPressure,
} from "@/lib/utils/unit-conversions";

interface SensorStatsProps {
  sensors: SensorData[];
}

export function SensorStats({ sensors }: SensorStatsProps) {
  const settings = useSettingsStore((state) => state.settings);

  // Calculate averages from all active sensors
  const stats = sensors.reduce(
    (acc, sensor) => ({
      avgTemperature: acc.avgTemperature + (sensor.temperature || 0),
      avgHumidity: acc.avgHumidity + (sensor.humidity || 0),
      avgPressure: acc.avgPressure + (sensor.pressure || 0),
      avgDistance: acc.avgDistance + (sensor.distance || 0),
      count: acc.count + 1,
    }),
    {
      avgTemperature: 0,
      avgHumidity: 0,
      avgPressure: 0,
      avgDistance: 0,
      count: 0,
    }
  );

  const activeSensors = sensors.length;
  const divisor = Math.max(stats.count, 1);

  // Calculate average values
  const avgTemperature = stats.avgTemperature / divisor;
  const avgHumidity = stats.avgHumidity / divisor;
  const avgPressure = stats.avgPressure / divisor;
  const avgDistance = stats.avgDistance / divisor;

  // Convert values based on selected units
  const convertedTemperature = convertTemperature(
    avgTemperature,
    settings.units.temperature
  );
  const convertedPressure = convertPressure(
    avgPressure,
    settings.units.pressure
  );

  const sensorReadings = [
    {
      title: "Temperature",
      value: convertedTemperature,
      unit: settings.units.temperature === "celsius" ? "°C" : "°F",
      icon: <Thermometer className="h-4 w-4 text-white" />,
      color: "bg-chart-1",
      progress: Math.min(100, (avgTemperature / 50) * 100), // Keep progress based on Celsius
    },
    {
      title: "Humidity",
      value: avgHumidity,
      unit: "%",
      icon: <Droplets className="h-4 w-4 text-white" />,
      color: "bg-chart-2",
      progress: Math.min(100, avgHumidity),
    },
    {
      title: "Pressure",
      value: convertedPressure,
      unit: settings.units.pressure,
      icon: <Wind className="h-4 w-4 text-white" />,
      color: "bg-chart-3",
      progress: Math.min(100, (avgPressure / 1100) * 100), // Keep progress based on hPa
    },
    {
      title: "Distance",
      value: avgDistance,
      unit: "cm",
      icon: <Ruler className="h-4 w-4 text-white" />,
      color: "bg-chart-4",
      progress: Math.min(100, (avgDistance / 400) * 100),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {sensorReadings.map((sensor) => (
        <SensorCard
          key={sensor.title}
          title={sensor.title}
          value={Number(sensor.value.toFixed(1))}
          unit={sensor.unit}
          icon={sensor.icon}
          color={sensor.color}
          progress={sensor.progress}
        />
      ))}
    </div>
  );
}
