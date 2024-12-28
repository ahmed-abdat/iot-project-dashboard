"use client";

import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/config/firebase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const login = async (formData: LoginFormData) => {
    try {
      setIsLoading(true);
      console.log("Starting login process...");

      const result = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      console.log("Firebase auth successful:", result.user.email);

      // Set user in store and cookie
      setUser(result.user);
      console.log("User set in store and cookie, redirecting...");

      toast.success("Welcome back! Redirecting to dashboard...");

      // Add a small delay to ensure cookie is set
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use replace instead of push for cleaner navigation
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to log in. Please check your credentials.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
      toast.success("Successfully logged out");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  return { login, signOut, isLoading };
}
