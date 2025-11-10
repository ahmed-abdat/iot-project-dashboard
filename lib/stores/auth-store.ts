"use client";

import { create } from "zustand";
import type { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => {
    // Update the store state
    set({ user, isAuthenticated: !!user });

    // Update the cookie
    if (user) {
      document.cookie = `auth-session=${JSON.stringify({
        isAuthenticated: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
      })}; path=/; max-age=${60 * 60 * 24 * 7}; secure; samesite=strict`;
    } else {
      document.cookie =
        "auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  },
}));
