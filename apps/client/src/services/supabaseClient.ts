import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/useAuthStore";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase utilisé uniquement pour Storage (upload direct de la
 * photo de profil) et, plus tard, les souscriptions Realtime.
 * L'authentification métier reste entièrement gérée par l'API Next.js
 * (voir useAuthStore) — ce client ne sert pas à l'auth, juste à transporter
 * le JWT courant vers Supabase pour que les policies RLS fonctionnent.
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY doivent être définis (voir .env.example).");
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
