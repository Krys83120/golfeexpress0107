import { create } from "zustand";
import type { User, Admin } from "@golfeexpress/types";

const STORAGE_KEY = "golfeexpress-admin-session";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  profile: Admin | null;
  error: string | null;

  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}

function persistSession(session: StoredSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  accessToken: null,
  refreshToken: null,
  user: null,
  profile: null,
  error: null,

  restoreSession: async () => {
    set({ status: "loading" });
    const raw = localStorage.getItem(STORAGE_KEY);
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
      if (!ADMIN_ROLES.includes(data.user.role)) throw new Error("Accès réservé aux administrateurs.");
      set({ status: "authenticated", user: data.user, profile: data.profile });
    } catch {
      const refreshed = await get().refreshSession();
      if (!refreshed) {
        persistSession(null);
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

      if (!ADMIN_ROLES.includes(data.user.role)) {
        throw new Error("Ce compte n'a pas les droits administrateur.");
      }

      persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      set({
        status: "authenticated",
        accessToken: data.session.accessToken,
        refreshToken: data.session.refreshToken,
        user: data.user,
        error: null,
      });

      try {
        const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${data.session.accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          set({ profile: meData.profile });
        }
      } catch {
        // Non bloquant.
      }
    } catch (err) {
      set({ status: "unauthenticated", error: err instanceof Error ? err.message : "Erreur inconnue." });
      throw err;
    }
  },

  logout: () => {
    persistSession(null);
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
      persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      set({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      return true;
    } catch {
      return false;
    }
  },
}));
