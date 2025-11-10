'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Legend,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Activity, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { SensorData, calculateVibrationMagnitude } from '@/types/sensor';
import { format } from 'date-fns';

interface MotorChartsProps {
  data: SensorData[];
}

// Acceleration Time Series Chart
export function AccelerationTimeSeriesChart({ data }: MotorChartsProps) {
  const chartData = data.slice(-50).map((d, index) => ({
    index: index + 1,
    time: d.timestamp?.toDate?.() ? format(d.timestamp.toDate(), 'HH:mm:ss') : 'N/A',
    accX: Number((d.accX ?? 0).toFixed(3)),
    accY: Number((d.accY ?? 0).toFixed(3)),
    accZ: Number((d.accZ ?? 0).toFixed(3)),
  }));

  const chartConfig = {
    accX: {
      label: "Axe-X",
      color: "hsl(var(--chart-1))",
    },
    accY: {
      label: "Axe-Y",
      color: "hsl(var(--chart-2))",
    },
    accZ: {
      label: "Axe-Z",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Chronologie de l'Accélération 3-Axes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart accessibilityLayer data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Accélération (m/s²)', angle: -90, position: 'insideLeft' }}
            />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value, name) => [`${Number(value).toFixed(3)} m/s²`, name]}
              />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="accX"
              stroke="var(--color-accX)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="accY"
              stroke="var(--color-accY)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="accZ"
              stroke="var(--color-accZ)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Vibration Magnitude Chart
export function VibrationMagnitudeChart({ data }: MotorChartsProps) {
  const chartData = data.slice(-50).map((d, index) => ({
    index: index + 1,
    time: d.timestamp?.toDate?.() ? format(d.timestamp.toDate(), 'HH:mm:ss') : 'N/A',
    magnitude: Number(calculateVibrationMagnitude(d.accX ?? 0, d.accY ?? 0, d.accZ ?? 0).toFixed(2)),
  }));

  const chartConfig = {
    magnitude: {
      label: "Magnitude de Vibration",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5" />
          Tendance de la Magnitude de Vibration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart accessibilityLayer data={chartData}>
            <defs>
              <linearGradient id="magnitudeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-magnitude)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-magnitude)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Magnitude (m/s²)', angle: -90, position: 'insideLeft' }}
            />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value) => [`${Number(value).toFixed(2)} m/s²`, 'Magnitude de Vibration']}
              />}
            />
            <Area
              type="monotone"
              dataKey="magnitude"
              stroke="var(--color-magnitude)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#magnitudeGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Anomaly Score Timeline
export function AnomalyScoreChart({ data }: MotorChartsProps) {
  // Filter to only show meaningful anomalies (above threshold 1.0 or marked as anomaly)
  const anomalyThreshold = 1.0;
  const filteredData = data.filter(d =>
    (d.anomalyScore ?? 0) >= anomalyThreshold || d.isAnomaly
  );

  const chartData = filteredData.slice(-50).map((d, index) => ({
    index: index + 1,
    time: d.timestamp?.toDate?.() ? format(d.timestamp.toDate(), 'HH:mm:ss') : 'N/A',
    score: Number((d.anomalyScore ?? 0).toFixed(3)),
    isAnomaly: d.isAnomaly ?? false,
  }));

  const chartConfig = {
    score: {
      label: "Distance K-means",
      color: "hsl(var(--destructive))",
    },
  } satisfies ChartConfig;

  const anomalyCount = filteredData.length;
  const totalCount = data.length;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Historique des Scores d'Anomalie
          <span className="text-sm font-normal text-muted-foreground">
            ({anomalyCount} anomalies / {totalCount} lectures)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Aucune anomalie détectée (seuil: {anomalyThreshold})
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                label={{ value: 'Distance K-means', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip
                content={<ChartTooltipContent
                  formatter={(value) => [`${Number(value).toFixed(3)} (seuil: ${anomalyThreshold})`, 'Score d\'Anomalie']}
                />}
              />
              <Bar
                dataKey="score"
                fill="var(--color-score)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Classification Distribution Chart
export function ClassificationDistributionChart({ data }: MotorChartsProps) {
  const idleCount = data.filter(d => d.classification === 'idle').length;
  const nominalCount = data.filter(d => d.classification === 'nominal').length;
  const anomalyCount = data.filter(d => d.isAnomaly === true).length;
  const totalCount = data.length || 1; // Prevent division by zero

  const chartData = [
    {
      name: 'idle',
      label: 'Inactif',
      count: idleCount,
      percentage: ((idleCount / totalCount) * 100).toFixed(1),
      fill: 'var(--color-idle)',
    },
    {
      name: 'nominal',
      label: 'Nominal',
      count: nominalCount,
      percentage: ((nominalCount / totalCount) * 100).toFixed(1),
      fill: 'var(--color-nominal)',
    },
    {
      name: 'anomaly',
      label: 'Anomalie',
      count: anomalyCount,
      percentage: ((anomalyCount / totalCount) * 100).toFixed(1),
      fill: 'var(--color-anomaly)',
    },
  ];

  const chartConfig = {
    idle: {
      label: "Inactif",
      color: "hsl(var(--muted-foreground))",
    },
    nominal: {
      label: "Nominal",
      color: "hsl(var(--chart-3))",
    },
    anomaly: {
      label: "Anomalie",
      color: "hsl(var(--destructive))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-5 w-5" />
          Distribution des Opérations du Moteur
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} />
            <ChartTooltip
              content={<ChartTooltipContent
                formatter={(value, name, props) => [
                  `${value} lectures (${props.payload.percentage}%)`,
                  props.payload.label
                ]}
              />}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--muted-foreground))' }}></div>
            <span>Inactif: {idleCount} ({((idleCount / totalCount) * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }}></div>
            <span>Nominal: {nominalCount} ({((nominalCount / totalCount) * 100).toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
            <span>Anomalie: {anomalyCount} ({((anomalyCount / totalCount) * 100).toFixed(1)}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
