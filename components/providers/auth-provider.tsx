"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/config/firebase";
import { useAuthStore } from "@/lib/stores/auth-store";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const setStoreUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Handle initial auth state
  useEffect(() => {
    if (isAuthenticated && pathname === "/login") {
      console.log("Already authenticated, redirecting to dashboard...");
      router.replace("/");
    }
  }, [isAuthenticated, pathname, router]);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", {
        user: user?.email,
        isAuthenticated,
      });
      setUser(user);
      setStoreUser(user);
      setIsLoading(false);

      if (user && pathname === "/login") {
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [setStoreUser, pathname, router, isAuthenticated]);

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
