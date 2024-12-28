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
import {
  convertTemperature,
  convertPressure,
} from "@/lib/utils/unit-conversions";

interface OverviewChartProps {
  data: SensorData[];
}

export function OverviewChart({ data }: OverviewChartProps) {
  const settings = useSettingsStore((state) => state.settings);

  // Convert data based on selected units
  const chartData = data.map((reading) => ({
    name: new Date(
      reading.timestamp?.toMillis?.() || Date.now()
    ).toLocaleTimeString(),
    temperature: Number(
      convertTemperature(
        reading.temperature,
        settings.units.temperature
      ).toFixed(1)
    ),
    humidity: Number(reading.humidity.toFixed(1)),
    pressure: Number(
      convertPressure(reading.pressure, settings.units.pressure).toFixed(1)
    ),
  }));

  console.log("Chart data with units:", {
    data: chartData,
    units: settings.units,
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
          {payload.map((item: any) => (
            <div key={item.dataKey} className="flex items-center gap-2 text-sm">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.stroke }}
              />
              <span className="capitalize">{item.name}:</span>
              <span className="font-medium">
                {item.value.toFixed(1)}
                {item.dataKey === "temperature"
                  ? settings.units.temperature === "celsius"
                    ? "°C"
                    : "°F"
                  : item.dataKey === "humidity"
                  ? "%"
                  : ` ${settings.units.pressure}`}
              </span>
            </div>
          ))}
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
              label={{
                value: `Pressure (${settings.units.pressure})`,
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
              dataKey="pressure"
              stroke="#ffc658"
              name={`Pressure (${settings.units.pressure})`}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
