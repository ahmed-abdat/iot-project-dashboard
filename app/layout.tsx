import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainSidebar } from "@/components/layout/main-sidebar";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Motor Health Monitor | TinyML Anomaly Detection",
  description: "Real-time motor health monitoring with ADXL345 sensor and Edge Impulse TinyML anomaly detection",
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
          <div className="flex h-screen overflow-hidden">
            <MainSidebar />
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
