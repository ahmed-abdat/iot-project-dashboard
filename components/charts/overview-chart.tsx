import { Card } from "@/components/ui/card";
import { SensorData } from "@/types/sensor";
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
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewChartProps {
  data: SensorData[];
  title: string;
  type: "temperature" | "humidity" | "pressure";
  isLoading?: boolean;
  error?: Error | null;
}

export function OverviewChart({
  data,
  title,
  type,
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

  const formatData = (data: SensorData[]) => {
    return data.map((reading) => ({
      timestamp: format(reading.timestamp.toDate(), "HH:mm:ss"),
      value: reading[type],
      quality: reading.readingQuality[type],
    }));
  };

  const getYAxisDomain = (type: OverviewChartProps["type"]) => {
    switch (type) {
      case "temperature":
        return [15, 35];
      case "humidity":
        return [30, 70];
      case "pressure":
        return [950, 1050];
      default:
        return ["auto", "auto"];
    }
  };

  const getUnit = (type: OverviewChartProps["type"]) => {
    switch (type) {
      case "temperature":
        return "°C";
      case "humidity":
        return "%";
      case "pressure":
        return "hPa";
      default:
        return "";
    }
  };

  const formattedData = formatData(data);
  const [yMin, yMax] = getYAxisDomain(type);
  const unit = getUnit(type);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              label={{ value: "Time", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              domain={[yMin, yMax]}
              label={{
                value: unit,
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} ${unit}`, "Value"]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
