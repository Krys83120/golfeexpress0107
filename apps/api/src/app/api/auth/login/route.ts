import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loginSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, withErrorHandling } from "@/middleware/auth";

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Réponse 200: { user, session: { accessToken, refreshToken, expiresAt } }
 *
 * Les 4 apps stockent accessToken/refreshToken et envoient
 * `Authorization: Bearer <accessToken>` sur toutes les requêtes suivantes.
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { email, password } = parsed.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    throw new ApiError(401, "Email ou mot de passe incorrect.");
  }

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });

  if (!user) {
    throw new ApiError(401, "Compte introuvable. Contactez le support.");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "Ce compte est suspendu ou banni.");
  }

  return NextResponse.json({
    user,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });
}

export const POST = withErrorHandling(handler);
