"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AlertProvider } from "@/components/providers/alert-provider";
import { Toaster } from "@/components/ui/sonner";
import { AlertIndicator } from "@/components/alerts/alert-indicator";
import { AlertMonitor } from "@/components/alerts/alert-monitor";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlertProvider>
            {children}
            <AlertIndicator />
            <AlertMonitor />
            <Toaster />
          </AlertProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
