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
      return `Au-dessus de ${value}`;
    case "below":
      return `En dessous de ${value}`;
    case "between":
      return `Entre ${value}${highValue}`;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);

  if (loading) {
    return (
      <PageContainer
        title="Gestion des Alertes"
        description="Configurer et gérer vos alertes de capteur"
      >
        <SkeletonCard className="h-[400px]" />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Gestion des Alertes"
        description="Configurer et gérer vos alertes de capteur"
      >
        <ErrorCard
          title="Échec du chargement des alertes"
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
      toast.success("Alerte supprimée avec succès");
    } catch (error) {
      toast.error("Échec de la suppression de l'alerte");
    }
    setIsDeleteDialogOpen(false);
    setDeletingAlertId(null);
  };

  const handleSubmit = async (data: CreateAlertInput) => {
    try {
      if (editingAlert) {
        await updateAlert(editingAlert.id, data);
        toast.success("Alerte mise à jour avec succès");
      } else {
        await createAlert(data);
        toast.success("Alerte créée avec succès");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Échec de l'enregistrement de l'alerte");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleAlert(id);
      toast.success("Statut de l'alerte mis à jour");
    } catch (error) {
      toast.error("Échec de la mise à jour du statut de l'alerte");
    }
  };

  const activeAlerts = alerts?.filter((a) => a.status === "active").length || 0;
  const triggeredAlerts =
    alerts?.filter((a) => a.status === "triggered").length || 0;

  return (
    <PageContainer
      title="Gestion des Alertes"
      description="Configurer et gérer vos alertes de capteur"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="h-8 px-3 text-sm">
            <Bell className="mr-2 h-4 w-4" />
            {activeAlerts} Actives
          </Badge>
          {triggeredAlerts > 0 && (
            <Badge variant="destructive" className="h-8 px-3 text-sm">
              <Bell className="mr-2 h-4 w-4" />
              {triggeredAlerts} Déclenchées
            </Badge>
          )}
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Créer une Alerte
        </Button>
      </div>

      {!alerts?.length ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Aucune alerte configurée</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Créez votre première alerte pour commencer à surveiller vos capteurs.
            </p>
            <Button onClick={handleCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Créer une Alerte
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
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Dernier Déclenchement</TableHead>
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
                      : "Jamais"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(alert.id)}
                        title={
                          alert.status === "active" ? "Désactiver" : "Activer"
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
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alert.id)}
                        title="Supprimer"
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
            <AlertDialogTitle>Supprimer l'Alerte</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette alerte ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </ConfirmDialog>
    </PageContainer>
  );
}
