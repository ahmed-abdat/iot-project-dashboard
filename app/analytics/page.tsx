'use client';

import { useState } from 'react';
import { useSensorHistory } from '@/hooks/use-sensor-data';
import { useVibrationTrends, useAnomalyDetection, useClassificationDistribution } from '@/hooks/use-motor-analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccelerationTimeSeriesChart,
  AnomalyScoreChart,
  ClassificationDistributionChart,
} from '@/components/motor-charts';
import { BarChart3, AlertTriangle, Activity, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<number>(24); // hours
  const { data: historicalData, isLoading } = useSensorHistory(undefined, timeRange);

  const vibrationTrends = useVibrationTrends(historicalData);
  const anomalyInfo = useAnomalyDetection(historicalData);
  const classificationDist = useClassificationDistribution(historicalData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const hasData = historicalData.length > 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Motor Analytics</h1>
          <p className="text-muted-foreground">
            Historical trends and insights from motor sensor data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 hour</SelectItem>
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
              <SelectItem value="720">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{historicalData.length} readings</Badge>
        </div>
      </div>

      {!hasData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Historical Data</h3>
              <p className="text-sm text-muted-foreground">
                No data available for the selected time range
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Vibration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vibrationTrends.average.toFixed(2)} m/s²</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak: {vibrationTrends.peak.toFixed(2)} m/s²
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vibration RMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vibrationTrends.rms.toFixed(2)} m/s²</div>
                <Badge
                  variant={
                    vibrationTrends.trend === 'increasing'
                      ? 'destructive'
                      : vibrationTrends.trend === 'decreasing'
                      ? 'default'
                      : 'secondary'
                  }
                  className="mt-1"
                >
                  {vibrationTrends.trend === 'increasing' && '↑ Increasing'}
                  {vibrationTrends.trend === 'decreasing' && '↓ Decreasing'}
                  {vibrationTrends.trend === 'stable' && '→ Stable'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Anomaly Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{anomalyInfo.anomalyRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {anomalyInfo.anomalyCount} of {historicalData.length} readings
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Nominal Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{classificationDist.nominalPercentage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {classificationDist.nominal.toLocaleString()} readings
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Idle Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{classificationDist.idlePercentage.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {classificationDist.idle.toLocaleString()} readings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Charts */}
          <Tabs defaultValue="acceleration" className="space-y-4">
            <TabsList>
              <TabsTrigger value="acceleration" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Acceleration
              </TabsTrigger>
              <TabsTrigger value="anomaly" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Anomaly Detection
              </TabsTrigger>
              <TabsTrigger value="distribution" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="acceleration" className="space-y-4">
              <AccelerationTimeSeriesChart data={historicalData} />
            </TabsContent>

            <TabsContent value="anomaly" className="space-y-4">
              <AnomalyScoreChart data={historicalData} />
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4">
              <ClassificationDistributionChart data={historicalData} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
