'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { SensorData } from '@/types/sensor';

interface MotorStatusCardProps {
  data?: SensorData;
}

export function MotorStatusCard({ data }: MotorStatusCardProps) {
  if (!data) {
    return (
      <Card className="transition-all hover:shadow-sm h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium text-muted-foreground">État du Moteur</div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="text-2xl font-bold">Inconnu</div>
          <p className="text-xs text-muted-foreground mt-1">0.0% de confiance</p>
          <div className="mt-auto pt-3 border-t">
            <p className="text-xs text-muted-foreground">En attente de données</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const classification = data.classification || 'unknown';
  const confidence = data.classificationConfidence ?? 0;
  const status = data.status || 'inactive';
  const isActive = status === 'active';
  const isNominal = classification === 'nominal';

  return (
    <Card className="transition-all hover:shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">État du Moteur</div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">
            {classification.charAt(0).toUpperCase() + classification.slice(1)}
          </div>
          {isActive && (
            <Badge variant={isNominal ? 'default' : 'secondary'} className="h-5">
              {isNominal ? 'Actif' : 'Inactif'}
            </Badge>
          )}
        </div>
        <div className="mt-auto pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confiance</span>
            <span className="font-medium">{confidence.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
