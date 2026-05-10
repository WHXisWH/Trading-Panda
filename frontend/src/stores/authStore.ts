import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  jwt: string | null;
  setAuth: (user: User, jwt: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      jwt: null,
      setAuth: (user, jwt) => set({ user, jwt }),
      clearAuth: () => set({ user: null, jwt: null }),
    }),
    { name: "trading-panda-auth" }
  )
);
