"use client";

import { Thermometer, Droplets, Wind, Activity, Ruler } from "lucide-react";
import { SensorCard } from "@/components/sensor-card";
import type { SensorData } from "@/types/sensor";
import { useSettingsStore } from "@/lib/stores/settings-store";
import {
  convertTemperature,
  convertGasLevel,
  convertDistance,
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
      avgGasLevel: acc.avgGasLevel + (sensor.gasLevel || 0),
      avgDistance: acc.avgDistance + (sensor.distance || 0),
      count: acc.count + 1,
    }),
    {
      avgTemperature: 0,
      avgHumidity: 0,
      avgGasLevel: 0,
      avgDistance: 0,
      count: 0,
    }
  );

  const activeSensors = sensors.length;
  const divisor = Math.max(stats.count, 1);

  // Calculate average values
  const avgTemperature = stats.avgTemperature / divisor;
  const avgHumidity = stats.avgHumidity / divisor;
  const avgGasLevel = stats.avgGasLevel / divisor;
  const avgDistance = stats.avgDistance / divisor;

  // Convert values based on selected units
  const convertedTemperature = convertTemperature(
    avgTemperature,
    settings.units.temperature
  );
  const convertedGasLevel = convertGasLevel(
    avgGasLevel,
    settings.units.gasLevel
  );
  const convertedDistance = convertDistance(
    avgDistance,
    settings.units.distance
  );

  // Define max values for each unit
  const maxTemperature = settings.units.temperature === "celsius" ? 50 : 122; // 50°C = 122°F
  const maxDistance = settings.units.distance === "cm" ? 400 : 157.48; // 400cm = 157.48 inches
  const maxGasLevel = settings.units.gasLevel === "percent" ? 1 : 10000; // 1% = 10000 ppm

  const sensorReadings = [
    {
      title: "Temperature",
      value: convertedTemperature,
      unit: settings.units.temperature === "celsius" ? "°C" : "°F",
      icon: <Thermometer className="h-4 w-4 text-white" />,
      color: "bg-chart-1",
      progress: Math.min(100, (convertedTemperature / maxTemperature) * 100),
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
      title: "Gas Level",
      value: convertedGasLevel,
      unit: settings.units.gasLevel === "percent" ? "%" : "ppm",
      icon: <Activity className="h-4 w-4 text-white" />,
      color: "bg-chart-3",
      progress: Math.min(100, (convertedGasLevel / maxGasLevel) * 100),
    },
    {
      title: "Distance",
      value: convertedDistance,
      unit: settings.units.distance,
      icon: <Ruler className="h-4 w-4 text-white" />,
      color: "bg-chart-4",
      progress: Math.min(100, (convertedDistance / maxDistance) * 100),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {sensorReadings.map((sensor) => (
        <SensorCard
          key={sensor.title}
          title={sensor.title}
          value={
            sensor.title === "Gas Level" &&
            settings.units.gasLevel === "percent"
              ? Number(sensor.value.toFixed(3))
              : Number(sensor.value.toFixed(1))
          }
          unit={sensor.unit}
          icon={sensor.icon}
          color={sensor.color}
          progress={sensor.progress}
        />
      ))}
    </div>
  );
}
