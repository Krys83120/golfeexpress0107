import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase "admin" — utilise la clé service_role, qui bypass les
 * policies RLS (Row Level Security). Réservé aux opérations strictement
 * côté serveur qui doivent agir au-delà des permissions d'un utilisateur
 * normal :
 *  - création d'un compte au nom d'un autre (ex: l'admin crée un compte PRO)
 *  - suppression d'un compte (cascade vers public."User" via le trigger)
 *  - opérations de modération
 *
 * NE JAMAIS exposer ce client ou sa clé côté front. Ce fichier ne doit être
 * importé que dans du code serveur (route handlers App Router).
 */
function assertServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("supabaseAdmin ne doit jamais être importé côté client.");
  }
}

assertServerEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (voir .env.example)."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
