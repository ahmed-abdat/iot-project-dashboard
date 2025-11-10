'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { useSensorData, useSensorHistory } from '@/hooks/use-sensor-data';
import { MotorStatusCard } from '@/components/motor-status-card';
import { AccelerationCard } from '@/components/acceleration-card';
import { AnomalyDetectionCard } from '@/components/anomaly-detection-card';
import { SystemSpecsCard } from '@/components/system-specs-card';
import {
  AccelerationTimeSeriesChart,
  AnomalyScoreChart,
  ClassificationDistributionChart,
} from '@/components/motor-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Activity, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export function MotorDashboard() {
  const { data: realtimeData, isLoading, error } = useSensorData();

  // Date range state - default to last 24 hours
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: subDays(new Date(), 1),
    to: new Date(),
  }));

  // Calculate hours for the history hook
  const hoursFromRange = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 24;
    const diff = dateRange.to.getTime() - dateRange.from.getTime();
    return Math.ceil(diff / (1000 * 60 * 60)); // Convert ms to hours
  }, [dateRange]);

  const { data: historicalData } = useSensorHistory(undefined, hoursFromRange);

  // Track live streaming status
  const [isLive, setIsLive] = useState(false);
  const lastUpdateTime = useRef<number>(Date.now());
  const lastTimestamp = useRef<string>('');

  // Get latest reading
  const latestReading = realtimeData && realtimeData.length > 0 ? realtimeData[0] : undefined;

  // Filter data to only include readings within the selected date range
  // IMPORTANT: Must be before early returns to comply with Rules of Hooks
  const filteredData = React.useMemo(() => {
    const allData = [...realtimeData, ...historicalData];

    // Debug logging
    console.log('📊 Data Debug:', {
      realtimeCount: realtimeData.length,
      historicalCount: historicalData.length,
      totalCount: allData.length,
      dateRange: dateRange ? {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString(),
      } : 'no range',
    });

    // If no date range, return all data
    if (!dateRange?.from || !dateRange?.to) {
      return allData;
    }

    // Filter to only include data within the selected range
    let debugCount = 0;
    const filtered = allData.filter((reading) => {
      const readingDate = reading.timestamp?.toDate?.();
      if (!readingDate) {
        console.warn('⚠️ Reading without valid timestamp:', reading);
        return false;
      }

      const readingTime = readingDate.getTime();

      // Set 'from' to start of day, 'to' to end of day to handle timezone issues
      const fromTime = new Date(dateRange.from!).setHours(0, 0, 0, 0);
      const toTime = new Date(dateRange.to!).setHours(23, 59, 59, 999);

      const isInRange = readingTime >= fromTime && readingTime <= toTime;

      // Debug first few readings
      if (debugCount < 3) {
        console.log('🔍 Checking reading:', {
          readingDate: readingDate.toLocaleString(),
          readingTime,
          fromTime: new Date(fromTime).toLocaleString(),
          toTime: new Date(toTime).toLocaleString(),
          isInRange,
        });
        debugCount++;
      }

      return isInRange;
    });

    console.log('✅ Filtered data count:', filtered.length);
    return filtered;
  }, [realtimeData, historicalData, dateRange]);

  const combinedData = filteredData;
  const hasData = combinedData.length > 0;

  // Detect when new data arrives (track timestamp changes)
  useEffect(() => {
    if (latestReading?.timestamp) {
      const currentTimestamp = latestReading.timestamp.toDate?.()?.getTime().toString() || '';

      // Check if this is a new reading (different timestamp)
      if (currentTimestamp && currentTimestamp !== lastTimestamp.current) {
        lastUpdateTime.current = Date.now();
        lastTimestamp.current = currentTimestamp;
        setIsLive(true);
      }
    }
  }, [latestReading]);

  // Check if data is still streaming (updates within last 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
      setIsLive(timeSinceLastUpdate < 5000); // 5 seconds threshold
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Chargement des données du moteur...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Erreur de Chargement des Données
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error.message || 'Échec du chargement des données du capteur. Veuillez vérifier votre configuration Firebase.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-screen-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Surveillance de Santé du Moteur</h1>
          <p className="text-sm text-muted-foreground">
            Données en temps réel du capteur ADXL345 avec détection d'anomalies TinyML
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <Badge variant="outline">{combinedData.length} lectures</Badge>
          {isLive && (
            <Badge variant="default" className="flex items-center gap-1.5">
              <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
              En direct
            </Badge>
          )}
          {latestReading && (
            <Badge variant="outline" className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {latestReading.timestamp?.toDate?.()
                ? new Date(latestReading.timestamp.toDate()).toLocaleTimeString()
                : 'N/A'}
            </Badge>
          )}
          {!latestReading && !isLive && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Aucune donnée
            </Badge>
          )}
        </div>
      </div>

      {/* Anomaly Alert Banner */}
      {latestReading?.isAnomaly && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 dark:text-red-100">
                  Anomalie Détectée
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Score d'anomalie: {latestReading.anomalyScore.toFixed(1)} - Le comportement du moteur est en dehors des paramètres normaux
                </p>
              </div>
              <Badge variant="destructive" className="ml-auto">
                Alerte
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-primary/10 animate-pulse"></div>
                </div>
                <Activity className="h-16 w-16 mx-auto text-primary relative z-10 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">En attente des Données du Moteur</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Aucune lecture de capteur détectée. Assurez-vous que votre appareil ESP32 est allumé,
                  connecté au WiFi et correctement configuré avec les identifiants Firebase.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Taux de données attendu: 2 lectures/sec</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Intervalle d'échantillonnage: 500ms</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Status Cards Row */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            <MotorStatusCard data={latestReading} />
            <AccelerationCard data={latestReading} />
            <AnomalyDetectionCard data={latestReading} historicalData={historicalData.slice(-10)} />
            <SystemSpecsCard />
          </div>

          {/* Essential Charts */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-3">
            <AccelerationTimeSeriesChart data={combinedData} />
            <AnomalyScoreChart data={combinedData} />
            <ClassificationDistributionChart data={combinedData} />
          </div>

          {/* Statistiques de Session */}
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            <Card className="transition-all hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">Total de Lectures</div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{combinedData.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Tout le temps</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">Anomalies</div>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {combinedData.filter(d => d.isAnomaly).length.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((combinedData.filter(d => d.isAnomaly).length / combinedData.length) * 100).toFixed(1)}% du total
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">Temps Inactif</div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {((combinedData.filter(d => d.classification === 'idle').length / combinedData.length) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {combinedData.filter(d => d.classification === 'idle').length.toLocaleString()} lectures
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-muted-foreground">Temps Actif</div>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">
                  {((combinedData.filter(d => d.classification === 'nominal').length / combinedData.length) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {combinedData.filter(d => d.classification === 'nominal').length.toLocaleString()} lectures
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
