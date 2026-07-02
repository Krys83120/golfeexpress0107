import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

    return fetch(`${API_BASE_URL}${path}`, {
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
