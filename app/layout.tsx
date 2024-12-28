import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { MainSidebar } from "@/components/layout/main-sidebar";
import "./globals.css";
import { AlertProvider } from "@/components/providers/alert-provider";
import { AlertIndicator } from "@/components/alerts/alert-indicator";
import { AlertMonitor } from "@/components/alerts/alert-monitor";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "IoT Control Dashboard",
  description: "Monitor and control your IoT devices",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "antialiased")}>
        <Providers>
          <AlertProvider>
            <div className="flex h-screen overflow-hidden">
              <MainSidebar />
              <main className="flex-1 overflow-y-auto bg-background">
                {children}
              </main>
            </div>
            <AlertIndicator />
            <AlertMonitor />
            <Toaster />
          </AlertProvider>
        </Providers>
      </body>
    </html>
  );
}
