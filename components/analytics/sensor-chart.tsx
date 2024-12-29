"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { format, isToday, isYesterday } from "date-fns";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { isSensorError, getSensorDisplayValue } from "@/types/sensor";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface SensorChartProps {
  title: string;
  data: any[];
  type: "line" | "area";
  dataKey: string;
  yAxisLabel: string;
  color: string;
  fill?: string;
  domain?: [number | "auto", number | "auto"];
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
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const unit = payload[0].unit || "";
    const hasError = payload[0].payload?.errors?.[payload[0].dataKey];
    const time = payload[0].payload?.time;

    return (
      <div className="bg-background/95 border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground">
          {time ? formatTimestamp(time) : label}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          />
          <span
            className={cn(
              "text-muted-foreground",
              hasError && "text-destructive font-medium"
            )}
          >
            {hasError ? (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Sensor Error
              </span>
            ) : value == null ? (
              "---"
            ) : (
              `${value.toFixed(1)}${unit}`
            )}
          </span>
        </div>
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
  fill,
  domain = ["auto", "auto"],
}: SensorChartProps) {
  // Calculate error rate
  const totalPoints = data.length;
  const errorPoints = data.filter((point) => point.errors?.[dataKey]).length;
  const errorRate = totalPoints > 0 ? (errorPoints / totalPoints) * 100 : 0;

  const renderChart = () => {
    const commonProps = {
      width: 500,
      height: 300,
      data: data.map((point) => ({
        ...point,
        [dataKey]: point[dataKey] != null ? Number(point[dataKey]) : null,
      })),
      margin: { top: 20, right: 20, bottom: 60, left: 60 },
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="timestamp"
          angle={-45}
          textAnchor="end"
          height={60}
          interval={Math.ceil(data.length / 10)}
          minTickGap={20}
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--foreground))"
          label={{
            value: "Time",
            position: "bottom",
            offset: 40,
            style: { fill: "hsl(var(--foreground))" },
          }}
        />
        <YAxis
          domain={domain}
          label={{
            value: yAxisLabel,
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fill: "hsl(var(--foreground))" },
          }}
          tick={{ fontSize: 11 }}
          width={60}
          tickCount={10}
          stroke="hsl(var(--foreground))"
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Legend verticalAlign="top" height={36} />
      </>
    );

    switch (type) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={fill}
              name={title}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        );
      default:
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
              connectNulls
            />
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {errorRate > 0 && (
          <Badge variant="destructive" className="h-6">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {errorRate.toFixed(1)}% Errors
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
