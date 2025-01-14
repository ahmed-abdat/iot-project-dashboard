import { Card } from "@/components/ui/card";
import {
  SensorData,
  isSensorError,
  getSensorDisplayValue,
} from "@/types/sensor";
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
import { format, isToday, isYesterday } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OverviewChartProps {
  data: SensorData[];
  type: "temperature" | "humidity" | "gasLevel" | "distance";
  title: string;
  color: string;
  isLoading?: boolean;
  error?: Error | null;
}

interface FormattedDataPoint {
  timestamp: string;
  time: Date;
  value: number | null;
  displayValue: number | null;
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
    const unit = payload[0].unit;
    const hasError = isSensorError(value);
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
            ) : (
              `${value?.toFixed(1)}${unit}`
            )}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function OverviewChart({
  data,
  title,
  type,
  color,
  isLoading,
  error,
}: OverviewChartProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="h-[300px]">
          <Skeleton className="w-full h-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-destructive">
          Error loading data: {error.message}
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  const formatData = (data: SensorData[], type: OverviewChartProps["type"]) => {
    return data.map((reading) => {
      const timestamp = formatTimestamp(reading.timestamp.toDate());
      const time = reading.timestamp.toDate();
      let value: number | null = null;

      // Safely get value based on type
      switch (type) {
        case "temperature":
          value = reading.temperature;
          break;
        case "humidity":
          value = reading.humidity;
          break;
        case "gasLevel":
          value = reading.gasLevel;
          break;
        case "distance":
          value = reading.distance;
          break;
      }

      return {
        timestamp,
        time,
        value,
        // Set to null for error values so they're not plotted
        displayValue: isSensorError(value) ? null : value,
      };
    });
  };

  const getYAxisDomain = (
    type: OverviewChartProps["type"]
  ): [number, number] => {
    switch (type) {
      case "temperature":
        return [-10, 50]; // Celsius range
      case "humidity":
        return [0, 100]; // Percentage range
      case "gasLevel":
        return [0, 10000]; // PPM range
      case "distance":
        return [0, 400]; // cm range
    }
  };

  const getUnit = (type: OverviewChartProps["type"]): string => {
    switch (type) {
      case "temperature":
        return "°C";
      case "humidity":
        return "%";
      case "gasLevel":
        return "ppm";
      case "distance":
        return "cm";
    }
  };

  const formattedData = formatData(data, type);
  const [yMin, yMax] = getYAxisDomain(type);
  const unit = getUnit(type);

  // Calculate error rate
  const totalPoints = data.length;
  const errorPoints = data.filter((point) => isSensorError(point[type])).length;
  const errorRate = totalPoints > 0 ? (errorPoints / totalPoints) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {errorRate > 0 && (
          <Badge variant="destructive" className="h-6">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {errorRate.toFixed(1)}% Errors
          </Badge>
        )}
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
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
                position: "insideBottom",
                offset: 40,
                style: { fill: "hsl(var(--foreground))" },
              }}
              stroke="hsl(var(--foreground))"
            />
            <YAxis
              domain={[yMin, yMax]}
              label={{
                value: unit,
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fill: "hsl(var(--foreground))" },
              }}
              stroke="hsl(var(--foreground))"
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="displayValue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 2, strokeWidth: 2 }}
              activeDot={{ r: 4, strokeWidth: 2 }}
              name={title}
              unit={unit}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
