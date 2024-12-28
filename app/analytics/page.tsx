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
import { differenceInHours, format, isToday } from "date-fns";
import type { SensorData } from "@/types/sensor";
import { useSettingsStore } from "@/lib/stores/settings-store";
import {
  convertTemperature,
  convertPressure,
} from "@/lib/utils/unit-conversions";
import type { Settings } from "@/lib/stores/settings-store";

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
        pressure: 3,
        timeGap: 2, // minutes
      };
    case "6":
      return {
        temperature: 0.5,
        humidity: 3,
        pressure: 4,
        timeGap: 10, // minutes
      };
    case "24":
      return {
        temperature: 0.8,
        humidity: 4,
        pressure: 6,
        timeGap: 30, // minutes
      };
    case "168": // 7 days
      return {
        temperature: 1.2,
        humidity: 6,
        pressure: 8,
        timeGap: 120, // minutes (2 hours)
      };
    default:
      return {
        temperature: 0.8,
        humidity: 4,
        pressure: 6,
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

    // Always keep points with quality issues
    const hasQualityIssue =
      current.readingQuality?.temperature !== "good" ||
      current.readingQuality?.humidity !== "good" ||
      current.readingQuality?.pressure !== "good";

    // Check for significant changes
    const tempChange =
      Math.abs(current.temperature - lastAddedPoint.temperature) >
      thresholds.temperature;
    const humidityChange =
      Math.abs(current.humidity - lastAddedPoint.humidity) >
      thresholds.humidity;
    const pressureChange =
      Math.abs(current.pressure - lastAddedPoint.pressure) >
      thresholds.pressure;

    // Check time gap
    const minutesSinceLastPoint =
      differenceInHours(
        current.timestamp.toDate(),
        lastAddedPoint.timestamp.toDate()
      ) * 60;

    if (
      hasQualityIssue ||
      tempChange ||
      humidityChange ||
      pressureChange ||
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
  timeRange: string,
  settings: Settings
) => {
  const getTimeFormat = (date: Date, timeRange: string) => {
    switch (timeRange) {
      case "1": // Last Hour
        return "HH:mm:ss";
      case "6": // Last 6 Hours
        return "HH:mm";
      case "24": // Last 24 Hours
        return isToday(date) ? "HH:mm" : "MMM d, HH:mm";
      case "168": // Last 7 Days
        return "MMM d, HH:mm";
      default:
        return "HH:mm";
    }
  };

  return data.map((item) => {
    const date = item.timestamp.toDate();
    const timeFormat = getTimeFormat(date, timeRange);
    return {
      timestamp: format(date, timeFormat),
      time: date,
      temperature: Number(
        convertTemperature(
          item.temperature,
          settings.units.temperature
        ).toFixed(1)
      ),
      humidity: Number(item.humidity.toFixed(1)),
      pressure: Number(
        convertPressure(item.pressure, settings.units.pressure).toFixed(1)
      ),
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
      type: "line" as const,
      dataKey: "temperature",
      yAxisLabel: `Temperature (${
        settings.units.temperature === "celsius" ? "°C" : "°F"
      })`,
      color: "hsl(var(--chart-1))",
      domain:
        settings.units.temperature === "celsius"
          ? ([10, 40] as [number, number]) // Wider range for Celsius
          : ([50, 104] as [number, number]), // Wider range for Fahrenheit
    },
    {
      title: "Humidity Analysis",
      type: "area" as const,
      dataKey: "humidity",
      yAxisLabel: "Humidity (%)",
      color: "hsl(var(--chart-2))",
      domain: [20, 80] as [number, number], // Wider range for humidity
    },
    {
      title: "Pressure Analysis",
      type: "bar" as const,
      dataKey: "pressure",
      yAxisLabel: `Pressure (${settings.units.pressure})`,
      color: "hsl(var(--chart-3) / 0.9)",
      domain:
        settings.units.pressure === "hPa"
          ? ([900, 1100] as [number, number]) // Wider range for hPa
          : ([675, 825] as [number, number]), // Wider range for mmHg
    },
  ];

  // Filter and format the data
  const data = rawData
    ? formatChartData(
        filterAnalyticsData(rawData, timeRange),
        timeRange,
        settings
      )
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
            <SensorChart key={chart.title} data={data} {...chart} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
