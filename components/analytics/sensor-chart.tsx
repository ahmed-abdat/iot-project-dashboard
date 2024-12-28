"use client";

import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, isToday, isYesterday } from "date-fns";
import { useSettingsStore } from "@/lib/stores/settings-store";

type ChartType = "line" | "area" | "bar";

interface SensorChartProps {
  title: string;
  data: any[];
  type: ChartType;
  dataKey: string;
  yAxisLabel: string;
  color: string;
  domain?: [number | "auto", number | "auto"];
}

interface ChartDataPoint {
  timestamp: string;
  time: Date;
  value: number;
}

const formatTimestamp = (timestamp: Date) => {
  if (isToday(timestamp)) {
    return format(timestamp, "HH:mm:ss");
  } else if (isYesterday(timestamp)) {
    return `Yesterday ${format(timestamp, "HH:mm")}`;
  }
  return format(timestamp, "MMM d, HH:mm");
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const settings = useSettingsStore((state) => state.settings);

  if (active && payload && payload.length) {
    const time = payload[0]?.payload?.time;
    return (
      <div className="bg-background/95 border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{time ? formatTimestamp(time) : label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mt-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>
              {entry.name}: {entry.value.toFixed(1)}
              {entry.dataKey === "temperature"
                ? settings.units.temperature === "celsius"
                  ? "°C"
                  : "°F"
                : entry.dataKey === "humidity"
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

export function SensorChart({
  title,
  data,
  type,
  dataKey,
  yAxisLabel,
  color,
  domain = ["auto", "auto"],
}: SensorChartProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 10, bottom: 50 },
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
        <XAxis
          dataKey="timestamp"
          angle={-45}
          textAnchor="end"
          height={60}
          interval={Math.ceil(data.length / 10)}
          minTickGap={20}
          tick={{ fontSize: 11 }}
          label={{
            value: "Time",
            position: "bottom",
            offset: 40,
          }}
        />
        <YAxis
          domain={domain}
          label={{
            value: yAxisLabel,
            angle: -90,
            position: "insideLeft",
            offset: 10,
          }}
          tick={{ fontSize: 11 }}
          width={60}
          tickCount={10}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Legend verticalAlign="top" height={36} />
      </>
    );

    switch (type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {commonElements}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              name={title}
              strokeWidth={2}
              dot={{ r: 1, strokeWidth: 1, fill: color }}
              activeDot={{ r: 4, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <Area
              type="monotone"
              dataKey={dataKey}
              fill={`${color}33`}
              stroke={color}
              name={title}
              strokeWidth={2}
              dot={{ r: 1, strokeWidth: 1, fill: color }}
              activeDot={{ r: 4, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              opacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={Math.ceil(data.length / 10)}
              minTickGap={20}
              tick={{ fontSize: 11 }}
              label={{
                value: "Time",
                position: "bottom",
                offset: 40,
              }}
            />
            <YAxis
              domain={domain}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
              tick={{ fontSize: 11 }}
              width={60}
              tickCount={10}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--background)", opacity: 0.2 }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar
              dataKey={dataKey}
              name={title}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
              fill={color}
              maxBarSize={40}
            />
          </BarChart>
        );
    }
  };

  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="h-[300px]">
        <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
      </div>
    </Card>
  );
}
