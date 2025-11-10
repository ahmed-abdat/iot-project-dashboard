"use client";

import { MainSidebar } from "@/components/layout/main-sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex flex-1 overflow-hidden">
        <MainSidebar />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    </ThemeProvider>
  );
}
