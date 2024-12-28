"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAlertStore,
  type Alert,
  type CreateAlertInput,
} from "@/lib/stores/alert-store";

export function useAlerts() {
  const queryClient = useQueryClient();
  const alertStore = useAlertStore();

  // Fetch alerts from store
  const {
    data: alerts,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertStore.alerts,
    initialData: alertStore.alerts,
  });

  // Create alert mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateAlertInput) => {
      const newAlert: Alert = {
        ...data,
        id: crypto.randomUUID(),
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      alertStore.addAlert(newAlert);
      return newAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Update alert mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Alert> }) => {
      alertStore.updateAlert(id, data);
      return alertStore.getAlert(id)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Delete alert mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      alertStore.deleteAlert(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Toggle alert mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      alertStore.toggleAlert(id);
      return alertStore.getAlert(id)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  return {
    alerts,
    loading: isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
    createAlert: createMutation.mutateAsync,
    updateAlert: (id: string, data: CreateAlertInput) =>
      updateMutation.mutateAsync({ id, data }),
    deleteAlert: deleteMutation.mutateAsync,
    toggleAlert: toggleMutation.mutateAsync,
  };
}
