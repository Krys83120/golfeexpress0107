import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshSchema } from "@/lib/validation/auth";
import { ApiError, withErrorHandling } from "@/middleware/auth";

/**
 * POST /api/auth/refresh
 *
 * Body: { refreshToken }
 * Réponse 200: { session: { accessToken, refreshToken, expiresAt } }
 *
 * À appeler par les apps quand l'access token a expiré (401 sur une requête).
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = refreshSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, "refreshToken manquant ou invalide.");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: parsed.data.refreshToken });

  if (error || !data.session) {
    throw new ApiError(401, "Session expirée, reconnexion nécessaire.");
  }

  return NextResponse.json({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });
}

export const POST = withErrorHandling(handler);
