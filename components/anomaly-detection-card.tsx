'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { SensorData } from '@/types/sensor';

interface AnomalyDetectionCardProps {
  data?: SensorData;
  historicalData?: SensorData[];
}

export function AnomalyDetectionCard({ data, historicalData = [] }: AnomalyDetectionCardProps) {
  if (!data) {
    return (
      <Card className="transition-all hover:shadow-md h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium text-muted-foreground">Détection d'Anomalies</div>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="text-2xl font-bold">0.0</div>
          <p className="text-xs text-muted-foreground mt-1">Aucune anomalie</p>
          <div className="mt-auto pt-3 border-t">
            <p className="text-xs text-muted-foreground">Seuil K-means: 1.0</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const anomalyScore = data.anomalyScore ?? 0;
  const isAnomaly = data.isAnomaly ?? false;

  // Count recent anomalies
  const recentAnomalies = historicalData.slice(-10).filter(d => d.isAnomaly ?? false).length;

  return (
    <Card className={`transition-all hover:shadow-sm h-full flex flex-col ${isAnomaly ? 'border-red-500' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">Score d'Anomalie</div>
        <Shield className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${isAnomaly ? 'text-red-500' : 'text-emerald-500'}`}>
            {anomalyScore.toFixed(1)}
          </div>
          {isAnomaly && (
            <Badge variant="destructive" className="h-5">
              Alerte
            </Badge>
          )}
        </div>
        <div className="mt-auto pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Anomalies récentes</span>
            <span className="font-medium">{recentAnomalies}/10</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
