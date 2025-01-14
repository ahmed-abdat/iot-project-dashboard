"use client";

import { SensorStats } from "@/components/dashboard/sensor-stats";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { PageContainer } from "@/components/layout/page-container";
import { useSensorData, useSensorHistory } from "@/hooks/use-sensor-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAlertStore } from "@/lib/stores/alert-store";

export function DashboardView() {
  const { data: realtimeSensors, isLoading: isLoadingRealtime } =
    useSensorData();
  const { data: historyData, isLoading: isLoadingHistory } = useSensorHistory(
    "esp32-001",
    24
  );

  const alerts = useAlertStore((state) => state.alerts);
  const triggeredAlerts = alerts.filter((a) => a.status === "triggered");
  const hasTriggeredAlerts = triggeredAlerts.length > 0;

  if (isLoadingRealtime || isLoadingHistory) {
    return (
      <PageContainer
        title="Dashboard"
        description="Real-time monitoring of all sensor data"
      >
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Dashboard"
      description="Real-time monitoring of all sensor data"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Sensor Dashboard</h1>
      </div>

      <div className="space-y-6">
        {!realtimeSensors?.length ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-600">No active sensors found</p>
          </div>
        ) : (
          <SensorStats sensors={realtimeSensors} />
        )}

        {historyData?.length > 0 && <OverviewChart data={historyData} />}
      </div>
    </PageContainer>
  );
}
