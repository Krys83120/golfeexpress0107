import { create } from "zustand";
import type { User, Pro } from "@golfeexpress/types";

const STORAGE_KEY = "golfeexpress-pro-session";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Sans timeout, un fetch qui ne répond jamais (cold start serveur...)
// laisse `restoreSession` bloquée en "loading" pour toujours — l'app
// restait figée en chargement, seul un rechargement manuel de la page
// "débloquait" la situation. On borne donc chaque appel à 15s pour que
// l'échec soit détecté et géré normalement (retry via refreshSession, ou
// passage en "unauthenticated").
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

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
  profile: Pro | null;
  /** true si le compte connecté est un employé (accès restreint) plutôt que le patron -- voir GET /api/auth/me. */
  isEmployee: boolean;
  error: string | null;

  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  setProfile: (profile: Pro) => void;
}

function persistSession(session: StoredSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  accessToken: null,
  refreshToken: null,
  user: null,
  profile: null,
  isEmployee: false,
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
      // PRO_EMPLOYEE = compte employé créé par un Pro, accès restreint côté
      // UI (voir App.tsx / Sidebar.tsx qui lisent `isEmployee` ci-dessous) --
      // voir prisma/schema.prisma model ProEmployee.
      if (data.user.role !== "PRO" && data.user.role !== "PRO_EMPLOYEE") {
        throw new Error("Ce compte n'est pas un compte commerçant.");
      }
      set({ status: "authenticated", user: data.user, profile: data.profile, isEmployee: !!data.isEmployee });
    } catch {
      const refreshed = await get().refreshSession();
      if (!refreshed) {
        persistSession(null);
        set({ status: "unauthenticated", accessToken: null, refreshToken: null, user: null, profile: null, isEmployee: false });
      }
    }
  },

  login: async (email, password) => {
    // Ne PAS passer status à "loading" ici : App.tsx affiche un écran
    // "Chargement..." séparé pour cet état, ce qui démonte LoginPage
    // pendant la requête puis le remonte neuf juste après — n'importe quel
    // message d'erreur/confirmation programmé pour s'afficher sur CETTE
    // instance de LoginPage se perd silencieusement, puisque la fonction
    // continue de s'exécuter sur un composant déjà démonté. LoginPage gère
    // déjà son propre indicateur de chargement local (`submitting`), donc
    // le statut global n'a besoin de refléter que le résultat final.
    set({ error: null });
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Connexion impossible.");

      // PRO_EMPLOYEE = compte employé créé par un Pro, accès restreint côté
      // UI -- voir prisma/schema.prisma model ProEmployee et le commentaire
      // équivalent dans restoreSession() ci-dessus.
      if (data.user.role !== "PRO" && data.user.role !== "PRO_EMPLOYEE") {
        throw new Error("Ce compte n'est pas un compte commerçant.");
      }

      persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
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
    // Voir le commentaire dans login() ci-dessus — même raison de ne pas
    // passer par status "loading" ici.
    set({ error: null });
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, role: "PRO" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Inscription impossible.");

      if (data.session) {
        persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
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

  setProfile: (profile) => set({ profile }),
}));

async function fetchAndSetProfile(accessToken: string, set: (partial: Partial<AuthState>) => void) {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      set({ profile: data.profile, isEmployee: !!data.isEmployee });
    }
  } catch {
    // Non bloquant.
  }
}
