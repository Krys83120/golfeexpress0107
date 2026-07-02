import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/useAuthStore";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Client Supabase utilisé uniquement pour Storage (upload direct
 * logo/bannière/photos produits) et, plus tard, les souscriptions
 * Realtime. L'authentification métier (signup/login/refresh) reste
 * entièrement gérée par l'API Next.js (voir useAuthStore) — ce client ne
 * sert PAS à l'auth, juste à transporter le JWT courant vers Supabase pour
 * que les policies RLS de Storage (auth.uid()) fonctionnent.
 *
 * On injecte le token courant à la demande (plutôt qu'une session Supabase
 * persistée) car la source de vérité de la session est useAuthStore.
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis (voir .env.example).");
  }

  const accessToken = useAuthStore.getState().accessToken;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
