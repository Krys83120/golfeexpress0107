import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, Rider } from "@golfeexpress/types";

const STORAGE_KEY = "golfeexpress-livreur-session";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  profile: Rider | null;
  error: string | null;

  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  /** Permet de mettre à jour le profil Rider localement après un PATCH réussi (ex: isOnline). */
  setProfile: (profile: Rider) => void;
  /** Permet de mettre à jour le User localement après un PATCH réussi (ex: avatar). */
  setUser: (user: User) => void;
}

async function persistSession(session: StoredSession | null) {
  if (session) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  accessToken: null,
  refreshToken: null,
  user: null,
  profile: null,
  error: null,

  restoreSession: async () => {
    set({ status: "loading" });
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ status: "unauthenticated" });
      return;
    }

    const session: StoredSession = JSON.parse(raw);
    set({ accessToken: session.accessToken, refreshToken: session.refreshToken });

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Session invalide");
      const data = await res.json();
      set({ status: "authenticated", user: data.user, profile: data.profile });
    } catch {
      const refreshed = await get().refreshSession();
      if (!refreshed) {
        await persistSession(null);
        set({ status: "unauthenticated", accessToken: null, refreshToken: null, user: null, profile: null });
      }
    }
  },

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connexion impossible.");

      if (data.user.role !== "RIDER") {
        throw new Error("Ce compte n'est pas un compte livreur.");
      }

      await persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      set({
        status: "authenticated",
        accessToken: data.session.accessToken,
        refreshToken: data.session.refreshToken,
        user: data.user,
        error: null,
      });

      await fetchAndSetProfile(data.session.accessToken, set);
    } catch (err) {
      set({ status: "unauthenticated", error: err instanceof Error ? err.message : "Erreur inconnue." });
      throw err;
    }
  },

  signup: async (input) => {
    set({ status: "loading", error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, role: "RIDER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inscription impossible.");

      if (data.session) {
        await persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
        set({
          status: "authenticated",
          accessToken: data.session.accessToken,
          refreshToken: data.session.refreshToken,
          user: data.user,
          error: null,
        });
        await fetchAndSetProfile(data.session.accessToken, set);
      } else {
        set({ status: "unauthenticated", error: null });
      }

      return { requiresEmailConfirmation: data.requiresEmailConfirmation };
    } catch (err) {
      set({ status: "unauthenticated", error: err instanceof Error ? err.message : "Erreur inconnue." });
      throw err;
    }
  },

  logout: async () => {
    await persistSession(null);
    set({ status: "unauthenticated", accessToken: null, refreshToken: null, user: null, profile: null });
  },

  refreshSession: async () => {
    const currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      await persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      set({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      return true;
    } catch {
      return false;
    }
  },

  setProfile: (profile) => set({ profile }),
  setUser: (user) => set({ user }),
}));

async function fetchAndSetProfile(accessToken: string, set: (partial: Partial<AuthState>) => void) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      set({ profile: data.profile });
    }
  } catch {
    // Non bloquant.
  }
}
