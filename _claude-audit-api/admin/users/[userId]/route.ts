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
 *
 * IMPORTANT : un trigger Postgres existant (handle_deleted_auth_user, sur
 * auth.users) supprime déjà automatiquement la ligne public."User"
 * correspondante dès qu'un compte Supabase Auth est supprimé — qui cascade
 * ensuite vers Client/Pro/Rider/Address/Notification (onDelete: Cascade,
 * voir schema.prisma). Il ne faut donc PAS supprimer nous-mêmes côté
 * Prisma AVANT Supabase Auth : le trigger se retrouverait sans rien à
 * supprimer et ça fait échouer toute l'opération côté Supabase
 * ("Database error deleting user"). La suppression Supabase Auth seule
 * suffit et déclenche tout le reste.
 *
 * Sécurité : Order n'est PAS en cascade — volontairement, pour ne jamais
 * effacer silencieusement un historique de commandes/facturation. On
 * vérifie donc l'absence de commandes AVANT de toucher à quoi que ce soit,
 * pour donner un message clair plutôt que de laisser échouer la
 * suppression en cours de route.
 */
async function deleteHandler(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAuth(req, ["ADMIN" as any, "SUPER_ADMIN" as any]);

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      clientProfile: { include: { _count: { select: { orders: true } } } },
      proProfile: { include: { _count: { select: { orders: true } } } },
      riderProfile: { include: { _count: { select: { orders: true } } } },
    },
  });
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
  const linkedOrders =
    (target.clientProfile?._count.orders ?? 0) +
    (target.proProfile?._count.orders ?? 0) +
    (target.riderProfile?._count.orders ?? 0);
  if (linkedOrders > 0) {
    throw new ApiError(
      409,
      "Impossible de supprimer ce compte : il a un historique de commandes lié (facturation/comptabilité). " +
        "Suspendez-le plutôt (statut) si vous voulez en bloquer l'accès."
    );
  }

  // Une seule suppression, côté Supabase Auth — le trigger existant se
  // charge de cascader vers nos tables métier automatiquement.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(target.id);
  if (error) {
    console.error(`[admin users] Échec suppression Supabase Auth pour ${target.id}:`, error);
    // Le message d'erreur réel de Supabase (souvent une contrainte de clé
    // étrangère précise, ex: "update or delete on table X violates foreign
    // key constraint Y") est renvoyé tel quel plutôt que masqué par un
    // message générique — ce panneau n'est utilisé que par des admins de
    // confiance, donc pas de risque à leur montrer le détail technique, et
    // ça évite d'avoir à aller chercher dans les logs Vercel à chaque fois.
    throw new ApiError(500, `La suppression a échoué : ${error.message || "erreur inconnue"} (code: ${error.code ?? error.status ?? "?"}).`);
  }

  return NextResponse.json({ deleted: true });
}

export const DELETE = withErrorHandling(deleteHandler);