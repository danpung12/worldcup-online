"use client";

import { create } from "zustand";
import { type AuthUser } from "@/lib/auth";

type AuthState = {
  isLoaded: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  setLoaded: () => void;
  setLoggedOut: () => void;
  setUser: (user: AuthUser) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoaded: false,
  isLoggedIn: false,
  user: null,
  setLoaded: () => set({ isLoaded: true }),
  setLoggedOut: () => set({ isLoaded: true, isLoggedIn: false, user: null }),
  setUser: (user) => set({ isLoaded: true, isLoggedIn: true, user }),
}));
