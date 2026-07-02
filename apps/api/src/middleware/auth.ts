import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { createSupabaseRouteClient } from "@/lib/supabaseRoute";
import { prisma } from "@/lib/prisma";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AuthContext {
  /** id Supabase Auth == id public."User" */
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Authentifie la requête courante via le header `Authorization: Bearer <token>`.
 * Lève une ApiError(401) si le token est absent/invalide, ou ApiError(403)
 * si `allowedRoles` est fourni et que le rôle de l'utilisateur n'y figure pas.
 *
 * Usage dans une route :
 *   const auth = await requireAuth(req, [UserRole.PRO]);
 */
export async function requireAuth(req: NextRequest, allowedRoles?: UserRole[]): Promise<AuthContext> {
  const supabase = createSupabaseRouteClient(req);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new ApiError(401, "Authentification requise ou token invalide.");
  }

  // On relit le rôle depuis public."User" (source de vérité métier) plutôt
  // que depuis les métadonnées du JWT, qui peuvent être obsolètes si le rôle
  // a été changé après l'émission du token (ex: promotion ADMIN).
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user) {
    throw new ApiError(401, "Utilisateur introuvable (synchronisation auth manquante).");
  }

  if (user.status !== "ACTIVE") {
    throw new ApiError(403, "Ce compte est suspendu ou banni.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    throw new ApiError(403, "Vous n'avez pas les droits nécessaires pour cette action.");
  }

  return { userId: user.id, email: user.email, role: user.role as UserRole };
}

/**
 * Wrapper standard pour les route handlers : centralise la gestion des
 * ApiError (401/403/...) et des erreurs inattendues (500), pour ne pas
 * répéter de try/catch dans chaque route.
 *
 * Générique sur la forme de `params` pour rester correctement typé sur les
 * routes dynamiques (ex: { productId: string }) sans cast `any`.
 */
export function withErrorHandling<TParams = Record<string, string>>(
  handler: (req: NextRequest, ctx: { params: TParams }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: TParams }) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("[API] Erreur inattendue:", err);
      return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
    }
  };
}
