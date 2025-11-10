"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorViewProps {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}

function getErrorMessage(error: Error & { code?: string }) {
  // Handle our custom email verification errors
  if (error.code) {
    switch (error.code) {
      case "CONFIG_ERROR":
        return "The email service is not properly configured. Please try again later.";
      case "DOMAIN_ERROR":
      case "TEST_MODE_ERROR":
        return "Unable to send verification email. Please try again later.";
      case "RATE_LIMIT":
        return "Too many attempts. Please wait a few minutes before trying again.";
      case "VALIDATION_ERROR":
        return "Please enter a valid email address.";
      case "SEND_ERROR":
        return "Unable to send verification email. Please try again later.";
      default:
        return "An unexpected error occurred. Please try again later.";
    }
  }

  // For other types of errors, return a generic message
  return "An unexpected error occurred. Please try again later.";
}

export default function Error({ error, reset }: ErrorViewProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Error</CardTitle>
          </div>
          <CardDescription>
            There was a problem with your request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={reset} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
