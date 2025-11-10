'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowUpDown } from 'lucide-react';
import { SensorData } from '@/types/sensor';

interface AccelerationCardProps {
  data?: SensorData;
}

export function AccelerationCard({ data }: AccelerationCardProps) {
  if (!data) {
    return (
      <Card className="transition-all hover:shadow-sm h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="text-sm font-medium text-muted-foreground">Accélération 3-Axes</div>
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Axe-X</span>
              <span className="text-lg font-semibold">0.000 m/s²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Axe-Y</span>
              <span className="text-lg font-semibold">0.000 m/s²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Axe-Z</span>
              <span className="text-lg font-semibold">0.000 m/s²</span>
            </div>
          </div>
          <div className="mt-auto pt-3 border-t">
            <p className="text-xs text-muted-foreground">Échantillonné à 390 Hz</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const accX = data.accX ?? 0;
  const accY = data.accY ?? 0;
  const accZ = data.accZ ?? 0;

  return (
    <Card className="transition-all hover:shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">Accélération 3-Axes</div>
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Axe-X</span>
            <span className="text-lg font-semibold">{accX.toFixed(3)} m/s²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Axe-Y</span>
            <span className="text-lg font-semibold">{accY.toFixed(3)} m/s²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Axe-Z</span>
            <span className="text-lg font-semibold">{accZ.toFixed(3)} m/s²</span>
          </div>
        </div>
        <div className="mt-auto pt-3 border-t">
          <p className="text-xs text-muted-foreground">Échantillonné à 390 Hz</p>
        </div>
      </CardContent>
    </Card>
  );
}
