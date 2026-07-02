import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, Client } from "@golfeexpress/types";

const STORAGE_KEY = "golfeexpress-client-session";
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
  profile: Client | null;
  error: string | null;

  /** À appeler une fois au démarrage de l'app pour restaurer une session persistée. */
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  /** Tente de renouveler l'access token. Renvoie true en cas de succès. */
  refreshSession: () => Promise<boolean>;
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
      // Le token a peut-être juste expiré (l'app a été fermée longtemps) :
      // on tente un refresh avant d'abandonner complètement.
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

      await persistSession({ accessToken: data.session.accessToken, refreshToken: data.session.refreshToken });
      set({
        status: "authenticated",
        accessToken: data.session.accessToken,
        refreshToken: data.session.refreshToken,
        user: data.user,
        error: null,
      });

      // /api/auth/login ne renvoie pas le profil Client complet (juste user) ;
      // on le récupère via /me pour avoir fidelityPoints/referralCode dispo
      // dès la connexion (utile pour l'écran Fidélité).
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
        body: JSON.stringify({ ...input, role: "CLIENT" }),
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
        // Confirmation email activée côté Supabase : pas de session immédiate.
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

  setUser: (user) => set({ user }),
}));

/**
 * Helper partagé entre login/signup pour récupérer le profil Client complet
 * juste après authentification, sans dupliquer la logique de fetch.
 */
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
    // Non bloquant : l'utilisateur reste connecté même si cette étape échoue,
    // le profil sera retenté à la prochaine ouverture de l'app.
  }
}
