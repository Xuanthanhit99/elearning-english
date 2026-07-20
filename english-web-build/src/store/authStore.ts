
import { create } from "zustand";

interface User {
  id: string;
  fullname: string;
  email: string;
  avatar?: string;
  username?: string | null;
  bio?: string | null;
  goal?: string | null;
  interests?: string[];
  phone?: string | null;
  englishLevel?: string | null;
  learningGoal?: string | null;
  level?: number | null;
  xp?: number | null;
  isPro?: boolean | null;
  createAt?: string | null;
  role?: string | null;
}

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated" | "error";
  setUser: (user: User | null) => void;
  setStatus: (status: AuthState["status"]) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  setStatus: (status) => set({ status }),
}));
