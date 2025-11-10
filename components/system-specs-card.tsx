'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Cpu, Zap, Clock, Radio } from 'lucide-react';

/**
 * System Specifications Card
 * Displays actual ESP32 hardware capabilities and TinyML model specs
 */
export function SystemSpecsCard() {
  return (
    <Card className="transition-all hover:shadow-sm h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="text-sm font-medium text-muted-foreground">System Specifications</div>
        <Cpu className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3">
          {/* Sampling Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Sampling</span>
            </div>
            <span className="text-xs font-medium">374 Hz</span>
          </div>

          {/* Window Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Window</span>
            </div>
            <span className="text-xs font-medium">2.0s</span>
          </div>

          {/* Inference Latency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Latency</span>
            </div>
            <span className="text-xs font-medium">59ms</span>
          </div>

          {/* Upload Interval */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Upload</span>
            </div>
            <span className="text-xs font-medium">500ms</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            ADXL345 ±16g • 2 Classes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
