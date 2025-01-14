"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SensorChart } from "@/components/analytics/sensor-chart";
import { useSensorHistory } from "@/hooks/use-sensor-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { differenceInHours, format } from "date-fns";
import type { SensorData } from "@/types/sensor";
import { isSensorError } from "@/types/sensor";
import { useSettingsStore } from "@/lib/stores/settings-store";
import {
  convertGasLevel,
  convertDistance,
  convertTemperature,
} from "@/lib/utils/unit-conversions";
import type { Settings } from "@/lib/stores/settings-store";
import type { ChartData } from "@/types/analytics";

const timeRanges = [
  { label: "Last Hour", value: "1", maxPoints: 30 }, // One point per 2 minutes
  { label: "Last 6 Hours", value: "6", maxPoints: 36 }, // One point per 10 minutes
  { label: "Last 24 Hours", value: "24", maxPoints: 48 }, // One point per 30 minutes
  { label: "Last 7 Days", value: "168", maxPoints: 84 }, // One point per 2 hours
] as const;

// Thresholds for different time ranges
const getThresholds = (timeRange: string) => {
  switch (timeRange) {
    case "1":
      return {
        temperature: 0.3, // More sensitive for shorter time
        humidity: 2,
        gasLevel: 3,
        timeGap: 2, // minutes
      };
    case "6":
      return {
        temperature: 0.5,
        humidity: 3,
        gasLevel: 4,
        timeGap: 10, // minutes
      };
    case "24":
      return {
        temperature: 0.8,
        humidity: 4,
        gasLevel: 6,
        timeGap: 30, // minutes
      };
    case "168": // 7 days
      return {
        temperature: 1.2,
        humidity: 6,
        gasLevel: 8,
        timeGap: 120, // minutes (2 hours)
      };
    default:
      return {
        temperature: 0.8,
        humidity: 4,
        gasLevel: 6,
        timeGap: 30,
      };
  }
};

const filterAnalyticsData = (
  data: SensorData[],
  timeRange: string
): SensorData[] => {
  if (!data.length) return data;

  const thresholds = getThresholds(timeRange);
  const targetPoints =
    timeRanges.find((r) => r.value === timeRange)?.maxPoints || 48;

  // If we have fewer points than target, return all data
  if (data.length <= targetPoints) return data;

  // Calculate the step size to achieve target points
  const step = Math.max(1, Math.floor(data.length / targetPoints));

  // Initialize with first point
  let filteredData: SensorData[] = [data[0]];
  let lastAddedPoint = data[0];

  // Process middle points
  for (let i = step; i < data.length - step; i += step) {
    const current = data[i];

    // Check for significant changes
    const tempChange =
      Math.abs(current.temperature - lastAddedPoint.temperature) >
      thresholds.temperature;
    const humidityChange =
      Math.abs(current.humidity - lastAddedPoint.humidity) >
      thresholds.humidity;
    const gasLevelChange =
      Math.abs(current.gasLevel - lastAddedPoint.gasLevel) >
      thresholds.gasLevel;

    // Check time gap
    const minutesSinceLastPoint =
      differenceInHours(
        current.timestamp.toDate(),
        lastAddedPoint.timestamp.toDate()
      ) * 60;

    if (
      tempChange ||
      humidityChange ||
      gasLevelChange ||
      minutesSinceLastPoint >= thresholds.timeGap
    ) {
      filteredData.push(current);
      lastAddedPoint = current;
    }
  }

  // Always add the last point
  if (
    data.length > 1 &&
    filteredData[filteredData.length - 1] !== data[data.length - 1]
  ) {
    filteredData.push(data[data.length - 1]);
  }

  return filteredData;
};

// Format data for charts
const formatChartData = (
  data: SensorData[],
  settings: Settings
): ChartData[] => {
  return data.map((item) => {
    // Convert timestamp to Date for better handling
    const time = item.timestamp.toDate();

    // Safely convert temperature
    const temperature =
      isSensorError(item.temperature) || item.temperature == null
        ? null
        : Number(
            convertTemperature(
              item.temperature,
              settings.units.temperature
            ).toFixed(1)
          );

    // Safely convert humidity
    const humidity =
      isSensorError(item.humidity) || item.humidity == null
        ? null
        : Number(item.humidity.toFixed(1));

    // Safely convert gas level
    const gasLevel =
      isSensorError(item.gasLevel) || item.gasLevel == null
        ? null
        : Number(
            convertGasLevel(item.gasLevel, settings.units.gasLevel).toFixed(
              settings.units.gasLevel === "percent" ? 3 : 0
            )
          );

    // Safely convert distance
    const distance =
      isSensorError(item.distance) || item.distance == null
        ? null
        : Number(
            convertDistance(item.distance, settings.units.distance).toFixed(1)
          );

    return {
      timestamp: format(time, "HH:mm:ss"),
      time,
      temperature,
      humidity,
      gasLevel,
      distance,
      // Add error flags for UI indicators
      errors: {
        temperature: isSensorError(item.temperature),
        humidity: isSensorError(item.humidity),
        gasLevel: isSensorError(item.gasLevel),
        distance: isSensorError(item.distance),
      },
    };
  });
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("24");
  const settings = useSettingsStore((state) => state.settings);
  const {
    data: rawData,
    isLoading,
    error,
  } = useSensorHistory("esp32-001", Number(timeRange));

  const charts = [
    {
      title: "Temperature Analysis",
      dataKey: "temperature",
      yAxisLabel: `Temperature (${
        settings.units.temperature === "celsius" ? "°C" : "°F"
      })`,
      color: "hsl(var(--chart-1))",
      type: "line" as const,
      fill: "hsl(var(--chart-1) / 0.1)",
      tooltipFormatter: (value: number) =>
        `${value.toFixed(1)}${
          settings.units.temperature === "celsius" ? "°C" : "°F"
        }`,
    },
    {
      title: "Humidity Analysis",
      dataKey: "humidity",
      yAxisLabel: "Humidity (%)",
      color: "hsl(var(--chart-2))",
      type: "area" as const,
      fill: "hsl(var(--chart-2) / 0.1)",
      tooltipFormatter: (value: number) => `${value.toFixed(1)}%`,
    },
    {
      title: "Gas Level Analysis",
      dataKey: "gasLevel",
      yAxisLabel: `Gas Level (${
        settings.units.gasLevel === "percent" ? "%" : "ppm"
      })`,
      color: "hsl(var(--chart-3))",
      type: "line" as const,
      tooltipFormatter: (value: number) =>
        settings.units.gasLevel === "percent"
          ? `${value.toFixed(3)}%`
          : `${value.toFixed(0)} ppm`,
    },
    {
      title: "Distance Analysis",
      dataKey: "distance",
      yAxisLabel: `Distance (${settings.units.distance})`,
      color: "hsl(var(--chart-4))",
      type: "line" as const,
      fill: "hsl(var(--chart-4) / 0.1)",
      tooltipFormatter: (value: number) =>
        `${value.toFixed(1)} ${settings.units.distance}`,
    },
  ];

  // Filter and format the data
  const data = rawData
    ? formatChartData(filterAnalyticsData(rawData, timeRange), settings)
    : [];

  if (isLoading) {
    return (
      <PageContainer
        title="Sensor Analytics"
        description="Historical sensor data visualization and analysis"
      >
        <div className="space-y-4">
          <div className="w-[200px]">
            <Skeleton className="h-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[300px]" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Sensor Analytics"
        description="Historical sensor data visualization and analysis"
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">Failed to load sensor data</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Sensor Analytics"
      description="Historical sensor data visualization and analysis"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {data.length} data points
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {charts.map((chart) => (
            <SensorChart
              key={chart.title}
              data={data}
              timeRange={timeRange}
              {...chart}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
