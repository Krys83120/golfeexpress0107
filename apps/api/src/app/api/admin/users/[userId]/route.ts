import { NextRequest, NextResponse } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function handler(req: NextRequest, { params }: { params: { userId: string } }) {
  await requireAuth(req, ["ADMIN" as any]);

  const body = await req.json();

  const data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
  } = {};

  if (typeof body.firstName === "string") data.firstName = body.firstName;
  if (typeof body.lastName === "string") data.lastName = body.lastName;
  if (typeof body.phone === "string") data.phone = body.phone;
  if (body.role && Object.values(UserRole).includes(body.role)) data.role = body.role;
  if (body.status && Object.values(UserStatus).includes(body.status)) data.status = body.status;

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Aucune donnée valide à modifier.");
  }

  const user = await prisma.user.update({
    where: { id: params.userId },
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(user);
}

export const PATCH = withErrorHandling(handler);

/**
 * DELETE /api/admin/users/[userId]
 *
 * Suppression réelle et définitive d'un compte — impossible à faire
 * proprement depuis le Dashboard Supabase seul, car il ne connaît que la
 * table auth.users, pas nos tables métier (Client/Pro/Rider/Order...).
 * Cette route supprime les deux à la fois, dans le bon ordre.
 *
 * Sécurité : les tables Client/Pro/Rider/Address/Notification sont en
 * cascade sur User (voir schema.prisma), donc supprimées automatiquement.
 * En revanche Order n'est PAS en cascade — volontairement, pour ne jamais
 * effacer silencieusement un historique de commandes/facturation. Si le
 * compte a des commandes, la suppression est refusée avec un message
 * clair plutôt que de planter avec une erreur SQL brute.
 */
async function deleteHandler(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAuth(req, ["ADMIN" as any, "SUPER_ADMIN" as any]);

  const target = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!target) {
    throw new ApiError(404, "Utilisateur introuvable.");
  }

  // Seul un SUPER_ADMIN peut supprimer un autre compte admin — évite
  // qu'un admin standard se fasse (ou fasse) supprimer par erreur.
  if ((target.role === "ADMIN" || target.role === "SUPER_ADMIN") && auth.role !== "SUPER_ADMIN") {
    throw new ApiError(403, "Seul un Super Admin peut supprimer un compte administrateur.");
  }
  if (target.id === auth.userId) {
    throw new ApiError(400, "Impossible de supprimer son propre compte depuis cet écran.");
  }

  try {
    // Prisma d'abord : si une contrainte (ex: commandes existantes)
    // bloque la suppression, on le sait ici, avant d'avoir touché à
    // Supabase Auth — le compte reste alors intact des deux côtés.
    await prisma.user.delete({ where: { id: target.id } });
  } catch (err: any) {
    if (err?.code === "P2003") {
      throw new ApiError(
        409,
        "Impossible de supprimer ce compte : il a un historique de commandes lié (facturation/comptabilité). " +
          "Suspendez-le plutôt (statut) si vous voulez en bloquer l'accès."
      );
    }
    throw err;
  }

  // Puis Supabase Auth, pour que la personne ne puisse plus se connecter
  // du tout. Si cette étape échoue (rare), la ligne Prisma est déjà
  // supprimée — on journalise plutôt que de faire échouer toute la
  // requête sur un compte déjà effectivement supprimé côté métier.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(target.id);
  if (error) {
    console.error(`[admin users] Compte ${target.id} supprimé côté Prisma mais échec Supabase Auth:`, error);
  }

  return NextResponse.json({ deleted: true });
}

export const DELETE = withErrorHandling(deleteHandler);