import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/useAuthStore";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Client Supabase utilisé uniquement pour Storage (upload direct des
 * assets de marque — logo, favicon, splash, images OpenGraph) — même
 * pattern que apps/pro/src/services/supabaseClient.ts, voir ce fichier
 * pour le détail du raisonnement.
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
