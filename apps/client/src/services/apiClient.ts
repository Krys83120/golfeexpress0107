import { useAuthStore } from "@/store/useAuthStore";

/**
 * URL de base de l'API. En dev, pointe vers le serveur Next.js lancé en
 * local (`npm run dev:api` depuis la racine du monorepo).
 *
 * Sur un appareil physique (pas le simulateur), `localhost` ne fonctionne
 * pas : remplacer par l'IP locale de votre machine sur le réseau Wi-Fi
 * (ex: http://192.168.1.42:3000) ou utiliser `expo start --tunnel`.
 *
 * EXPO_PUBLIC_API_URL peut être défini dans un fichier .env (lu
 * automatiquement par Expo au build) pour ne pas committer cette valeur en
 * dur — voir .env.example à la racine de cette app.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Un `fetch` sans limite de temps peut rester bloqué indéfiniment (cold
 * start serveur, connexion qui ne répond jamais...) — l'app restait alors
 * figée en "chargement" sans jamais échouer ni réessayer, obligeant
 * l'utilisateur à recharger la page pour s'en sortir. On borne donc chaque
 * appel réseau à 15s : passé ce délai, la requête est annulée et remonte
 * comme une erreur réseau normale, que le code appelant sait déjà gérer.
 */
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export class ApiRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Si true, n'envoie pas le header Authorization même si un token existe. */
  skipAuth?: boolean;
}

/**
 * Effectue un appel à l'API, injecte automatiquement le token d'auth, et
 * tente un refresh transparent en cas de 401 (token expiré) avant de
 * réessayer une fois. Si le refresh échoue aussi, déconnecte l'utilisateur.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = options;

  async function performRequest(): Promise<Response> {
    const accessToken = skipAuth ? null : useAuthStore.getState().accessToken;

    return fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  let response = await performRequest();

  if (response.status === 401 && !skipAuth) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) {
      response = await performRequest();
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Erreur réseau inconnue." }));
    if (response.status === 401) {
      // Le refresh a échoué ou n'a pas pu être tenté : la session n'est
      // plus valide, on déconnecte proprement plutôt que de laisser l'app
      // dans un état incohérent avec un token mort.
      await useAuthStore.getState().logout();
    }
    throw new ApiRequestError(response.status, errorBody.error ?? "Une erreur est survenue.");
  }

  // Les routes type DELETE renvoient parfois un corps vide.
  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}

/**
 * Variante de apiFetch pour les réponses binaires (PDF de ticket...) — même
 * logique d'auth/refresh, mais renvoie un Blob plutôt que de tenter un
 * JSON.parse qui casserait sur un contenu non-JSON.
 */
export async function apiFetchBlob(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<Blob> {
  const { method = "GET", body } = options;

  async function performRequest(): Promise<Response> {
    const accessToken = useAuthStore.getState().accessToken;
    return fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  let response = await performRequest();

  if (response.status === 401) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) response = await performRequest();
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Erreur réseau inconnue." }));
    if (response.status === 401) {
      await useAuthStore.getState().logout();
    }
    throw new ApiRequestError(response.status, errorBody.error ?? "Une erreur est survenue.");
  }

  return response.blob();
}
