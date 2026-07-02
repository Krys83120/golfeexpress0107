import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Crée un client Supabase scopé à la requête en cours, à partir du token
 * Bearer envoyé par les apps clientes (Client/Livreur/Pro/Admin) :
 *
 *   Authorization: Bearer <access_token>
 *
 * Ce client permet de vérifier qui fait la requête (`getUser()`), avec les
 * policies RLS appliquées normalement (pas de bypass), contrairement à
 * supabaseAdmin.
 *
 * Nos 4 apps sont des clients API purs (mobile/SPA), pas des navigateurs
 * avec cookies de session — l'auth circule donc via le header Authorization,
 * pas via cookies. On fournit quand même un cookie store vide pour satisfaire
 * l'API de @supabase/ssr.
 */
export function createSupabaseRouteClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

  const noopCookies: CookieMethodsServer = {
    getAll: () => [],
    setAll: () => {},
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: noopCookies,
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}
