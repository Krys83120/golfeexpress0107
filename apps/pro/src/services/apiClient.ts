import { useAuthStore } from "@/store/useAuthStore";

/**
 * URL de base de l'API. En dev, pointe vers le serveur Next.js lancé en
 * local (`npm run dev:api` depuis la racine du monorepo). Vite expose les
 * variables préfixées VITE_ via import.meta.env (voir .env.example).
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
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
      useAuthStore.getState().logout();
    }
    throw new ApiRequestError(response.status, errorBody.error ?? "Une erreur est survenue.");
  }

  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as T);
}

/**
 * Variante de apiFetch pour les réponses binaires (PDF de rapport Z, ticket
 * de commande...) — même logique d'auth/refresh, mais renvoie un Blob
 * plutôt que de tenter un JSON.parse qui casserait sur un contenu non-JSON.
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
      useAuthStore.getState().logout();
    }
    throw new ApiRequestError(response.status, errorBody.error ?? "Une erreur est survenue.");
  }

  return response.blob();
}
