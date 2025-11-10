"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background/95 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenue</h1>
          <p className="text-muted-foreground text-sm">
            Entrez vos identifiants pour accéder au tableau de bord
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Protégé par Firebase Authentication
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
