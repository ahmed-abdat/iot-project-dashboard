"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SensorData } from "@/types/sensor";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { convertTemperature } from "@/lib/utils/unit-conversions";

interface OverviewChartProps {
  data: SensorData[];
}

export function OverviewChart({ data }: OverviewChartProps) {
  const settings = useSettingsStore((state) => state.settings);

  // Convert data based on selected units
  const chartData = data.map((reading) => {
    // Get timestamp
    const timestamp = reading.timestamp?.toMillis?.() || Date.now();
    const time = new Date(timestamp).toLocaleTimeString();

    // Safely convert temperature
    const temperature =
      reading.temperature != null
        ? Number(
            convertTemperature(
              reading.temperature,
              settings.units.temperature
            ).toFixed(1)
          )
        : null;

    // Safely convert humidity
    const humidity =
      reading.humidity != null ? Number(reading.humidity.toFixed(1)) : null;

    // Safely convert gas level
    const gasLevel =
      reading.gasLevel != null ? Number(reading.gasLevel.toFixed(1)) : null;

    return {
      name: time,
      temperature,
      humidity,
      gasLevel,
    };
  });

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensor Overview</CardTitle>
          <CardDescription>Historical sensor data over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="text-sm font-medium">{label}</div>
          {payload.map((item: any) => {
            // Skip rendering if value is undefined or null
            if (item.value == null) return null;

            // Safely format the value
            const formattedValue =
              typeof item.value === "number" ? item.value.toFixed(1) : "---";

            return (
              <div
                key={item.dataKey}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.stroke }}
                />
                <span className="capitalize">{item.name}:</span>
                <span className="font-medium">
                  {formattedValue}
                  {item.dataKey === "temperature"
                    ? settings.units.temperature === "celsius"
                      ? "°C"
                      : "°F"
                    : item.dataKey === "humidity" || item.dataKey === "gasLevel"
                    ? "%"
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sensor Overview</CardTitle>
        <CardDescription>Historical sensor data over time</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis
              yAxisId="left"
              width={60}
              tickCount={5}
              stroke="currentColor"
              label={{
                value: `Temperature (${
                  settings.units.temperature === "celsius" ? "°C" : "°F"
                })`,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={60}
              tickCount={5}
              stroke="currentColor"
              label={{
                value: "Gas Level (%)",
                angle: 90,
                position: "insideRight",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              stroke="#8884d8"
              name={`Temperature (${
                settings.units.temperature === "celsius" ? "°C" : "°F"
              })`}
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="humidity"
              stroke="#82ca9d"
              name="Humidity (%)"
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gasLevel"
              stroke="#ffc658"
              name="Gas Level (%)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
