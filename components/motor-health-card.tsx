'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, TrendingUp, TrendingDown } from 'lucide-react';
import { SensorData } from '@/types/sensor';
import { useMotorHealth } from '@/hooks/use-motor-analytics';

interface MotorHealthCardProps {
  data: SensorData[];
}

export function MotorHealthCard({ data }: MotorHealthCardProps) {
  const health = useMotorHealth(data);

  if (data.length === 0) {
    return (
      <Card className="transition-all hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium text-muted-foreground">Score de Santé du Moteur</div>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground mt-1">sur 100</p>
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === 'excellent' || status === 'good') return 'default';
    if (status === 'fair') return 'secondary';
    return 'destructive';
  };

  const healthColor = getHealthColor(health.score);

  // Mock trend calculation (could be calculated from historical data)
  const trend = health.score >= 75 ? 'up' : 'down';
  const trendValue = health.score >= 75 ? '+4.5%' : '-2.1%';

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">Score de Santé du Moteur</div>
        <Heart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${healthColor}`}>
            {health.score}
          </div>
          <Badge variant={getHealthBadgeVariant(health.status)} className="h-5">
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <p className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
            {trendValue}
          </p>
        </div>
        <div className="mt-4 pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Classification</span>
            <span className="font-medium">{health.factors.classification}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Détection d'Anomalies</span>
            <span className="font-medium">{health.factors.anomaly}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stabilité des Vibrations</span>
            <span className="font-medium">{health.factors.vibration}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
