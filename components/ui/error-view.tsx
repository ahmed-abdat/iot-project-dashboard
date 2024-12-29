"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface ErrorViewProps {
  error: Error;
  reset: () => void;
}

export function ErrorView({ error, reset }: ErrorViewProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <RefreshCw className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}
