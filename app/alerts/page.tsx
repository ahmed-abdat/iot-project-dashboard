"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Bell, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog } from "@/components/alerts/alert-dialog";
import { useAlerts } from "@/hooks/use-alerts";
import {
  type Alert,
  type CreateAlertInput,
  ALERT_DEFAULTS,
} from "@/lib/stores/alert-store";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorCard } from "@/components/ui/error-card";
import {
  AlertDialog as ConfirmDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAlertStore } from "@/lib/stores/alert-store";

const formatCondition = (alert: Alert) => {
  const defaults = ALERT_DEFAULTS[alert.type];
  const value = `${alert.threshold}${defaults.unit}`;
  const highValue = alert.thresholdHigh
    ? ` and ${alert.thresholdHigh}${defaults.unit}`
    : "";

  switch (alert.operator) {
    case "above":
      return `Above ${value}`;
    case "below":
      return `Below ${value}`;
    case "between":
      return `Between ${value}${highValue}`;
  }
};

export default function AlertsPage() {
  const {
    alerts,
    loading,
    error,
    refetch,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
  } = useAlerts();
  const alertStore = useAlertStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);

  useEffect(() => {
    alertStore.initialize();
  }, [alertStore]);

  if (loading) {
    return (
      <PageContainer
        title="Alert Management"
        description="Configure and manage your sensor alerts"
      >
        <SkeletonCard className="h-[400px]" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Alert Management"
        description="Configure and manage your sensor alerts"
      >
        <ErrorCard
          title="Failed to load alerts"
          message={error.message}
          onRetry={refetch}
        />
      </PageContainer>
    );
  }

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingAlert(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingAlertId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAlertId) return;
    try {
      await deleteAlert(deletingAlertId);
      toast.success("Alert deleted successfully");
    } catch (error) {
      toast.error("Failed to delete alert");
    }
    setIsDeleteDialogOpen(false);
    setDeletingAlertId(null);
  };

  const handleSubmit = async (data: CreateAlertInput) => {
    try {
      if (editingAlert) {
        await updateAlert(editingAlert.id, data);
        toast.success("Alert updated successfully");
      } else {
        await createAlert(data);
        toast.success("Alert created successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save alert");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAlert(id);
      toast.success("Alert status updated");
    } catch (error) {
      toast.error("Failed to update alert status");
    }
  };

  const activeAlerts = alerts?.filter((a) => a.status === "active").length || 0;
  const triggeredAlerts =
    alerts?.filter((a) => a.status === "triggered").length || 0;

  return (
    <PageContainer
      title="Alert Management"
      description="Configure and manage your sensor alerts"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="h-8 px-3 text-sm">
            <Bell className="mr-2 h-4 w-4" />
            {activeAlerts} Active
          </Badge>
          {triggeredAlerts > 0 && (
            <Badge variant="destructive" className="h-8 px-3 text-sm">
              <Bell className="mr-2 h-4 w-4" />
              {triggeredAlerts} Triggered
            </Badge>
          )}
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Create Alert
        </Button>
      </div>

      {!alerts?.length ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No alerts configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first alert to start monitoring your sensors.
            </p>
            <Button onClick={handleCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Create Alert
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="font-medium capitalize">
                    {alert.type}
                  </TableCell>
                  <TableCell>{formatCondition(alert)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {alert.message}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        alert.status === "triggered"
                          ? "destructive"
                          : alert.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        alert.priority === "high"
                          ? "destructive"
                          : alert.priority === "medium"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {alert.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {alert.lastTriggered
                      ? new Date(alert.lastTriggered).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(alert.id)}
                        title={
                          alert.status === "active" ? "Deactivate" : "Activate"
                        }
                      >
                        <Power
                          className={`h-4 w-4 ${
                            alert.status === "active"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(alert)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alert.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        alert={editingAlert}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alert</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this alert? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </ConfirmDialog>
    </PageContainer>
  );
}
