import { create } from "zustand";
import type { User, Admin } from "@golfeexpress/types";

const STORAGE_KEY = "golfeexpress-admin-session";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Sans timeout, un fetch qui ne répond jamais (cold start serveur...)
// laisse `restoreSession` bloquée en "loading" pour toujours — l'app
// restait figée en chargement, seul un rechargement manuel de la page
// "débloquait" la situation. On borne donc chaque appel à 8s pour que
// l'échec soit détecté et géré normalement (retry via refreshSession, ou
// passage en "unauthenticated"). Ramené de 15s à 8s le 27/09/2026 --
// couplé à la correction ci-dessous dans restoreSession() (plus de retry
// automatique sur un simple timeout), le pire cas passe de 30s à ~8s.
const FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

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
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error("Session invalide");
      const data = await res.json();
      if (!ADMIN_ROLES.includes(data.user.role)) throw new Error("Accès réservé aux administrateurs.");
      set({ status: "authenticated", user: data.user, profile: data.profile });
    } catch (err) {
      // On ne retente un refresh que si le serveur a explicitement rejeté
      // le token (401/session invalide). Si l'échec vient d'un timeout
      // réseau (fetchWithTimeout qui abandonne après FETCH_TIMEOUT_MS),
      // refaire un second appel réseau de la même durée ne fait que
      // doubler l'attente pour rien (jusqu'à 30s au total avant ce
      // correctif du 27/09/2026, suite au signalement d'écrans de
      // chargement bloqués) : on passe directement en "unauthenticated".
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const refreshed = isTimeout ? false : await get().refreshSession();
      if (!refreshed) {
        persistSession(null);
        set({ status: "unauthenticated", accessToken: null, refreshToken: null, user: null, profile: null });
      }
    }
  },

  login: async (email, password) => {
    set({ status: "loading", error: null });
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
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
        const meRes = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
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
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
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
