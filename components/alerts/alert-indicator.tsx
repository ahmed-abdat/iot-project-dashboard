"use client";

import { useAlertStore } from "@/lib/stores/alert-store";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AlertIndicator() {
  const pathname = usePathname();
  const alerts = useAlertStore((state) => state.alerts);
  const triggeredAlerts = alerts.filter((a) => a.status === "triggered");
  const hasTriggeredAlerts = triggeredAlerts.length > 0;

  // Don't show on alerts page
  if (pathname === "/alerts") return null;

  if (!hasTriggeredAlerts) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href="/alerts" className="transition-transform hover:scale-105">
        <Badge
          variant="destructive"
          className="h-10 px-4 text-sm animate-pulse shadow-lg hover:shadow-xl transition-shadow"
        >
          <Bell className="mr-2 h-4 w-4" />
          {triggeredAlerts.length} Alert{triggeredAlerts.length > 1 ? "s" : ""}{" "}
          Triggered
        </Badge>
      </Link>
    </div>
  );
}
