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

export interface ProAuthContext extends AuthContext {
  /** Boutique concernée -- Pro.id, résolu que le compte connecté soit le patron ou un employé. */
  proId: string;
  /** true si le compte connecté est un employé (accès restreint côté route appelante). */
  isEmployee: boolean;
}

/**
 * Authentifie la requête ET résout le `proId` concerné, que le compte
 * connecté soit le Pro "patron" (role PRO, via Pro.userId) ou un compte
 * employé (role PRO_EMPLOYEE, via ProEmployee.userId -> proId) -- voir
 * prisma/schema.prisma model ProEmployee.
 *
 * A utiliser dans les routes Pro qui doivent rester accessibles aux
 * employés (commandes, notifications, impression des tickets...) :
 *   const { proId, isEmployee } = await requireProOrEmployee(req);
 *
 * Pour une route réservée au patron (Finances, Paramètres, abonnement,
 * gestion des employés eux-mêmes...), utiliser plutôt
 * `requireAuth(req, [UserRole.PRO])` -- ne jamais s'appuyer uniquement sur
 * le flag `isEmployee` retourné ici pour restreindre une route sensible, au
 * cas où l'appelant oublierait de le vérifier.
 */
export async function requireProOrEmployee(req: NextRequest): Promise<ProAuthContext> {
  const auth = await requireAuth(req, [UserRole.PRO, UserRole.PRO_EMPLOYEE]);

  if (auth.role === UserRole.PRO) {
    const pro = await prisma.pro.findUnique({
      where: { userId: auth.userId },
      select: { id: true },
    });
    if (!pro) {
      throw new ApiError(404, "Profil commerçant introuvable.");
    }
    return { ...auth, proId: pro.id, isEmployee: false };
  }

  const employee = await prisma.proEmployee.findUnique({
    where: { userId: auth.userId },
    select: { proId: true },
  });
  if (!employee) {
    throw new ApiError(404, "Compte employé introuvable ou détaché de sa boutique.");
  }
  return { ...auth, proId: employee.proId, isEmployee: true };
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
