import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/pros/[proId]/products/reset
 *
 * Supprime TOUS les produits d'un Pro donné (et leurs groupes d'options /
 * choix, qui suivent en cascade -- voir ProductOption.product et
 * OptionChoice.option dans schema.prisma, tous deux onDelete: Cascade).
 * Action destructive réservée ADMIN/SUPER_ADMIN, pensée pour nettoyer un
 * import CSV raté (doublons, accents corrompus -- voir l'ancien bug de
 * lecture forcée en UTF-8 dans apps/admin/src/components/AdminImportMenuModal.tsx)
 * avant de réimporter proprement via POST .../products/import. Utilisée
 * automatiquement par la case "Vider les produits existants" de cette même
 * modale d'import.
 *
 * Un produit déjà commandé au moins une fois (OrderItem.productId, relation
 * volontairement SANS onDelete: Cascade pour ne jamais perdre l'historique
 * d'une vraie commande) ou ayant reçu un avis (ProductReview) ne peut pas
 * être supprimé : la suppression de CE produit échoue seule (contrainte de
 * clé étrangère), les autres continuent normalement. La réponse distingue
 * clairement supprimés / conservés, pour que l'admin sache s'il reste des
 * produits "réels" à traiter à la main plutôt que par ce nettoyage en masse.
 */
async function postHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const products = await prisma.product.findMany({
    where: { proId },
    select: { id: true, name: true },
  });

  let deletedCount = 0;
  const kept: { id: string; name: string }[] = [];

  for (const product of products) {
    try {
      await prisma.product.delete({ where: { id: product.id } });
      deletedCount++;
    } catch {
      // Contrainte de clé étrangère (commande ou avis existant sur ce
      // produit) -- on le laisse tel quel plutôt que de faire échouer tout
      // le nettoyage pour les autres produits du même Pro.
      kept.push({ id: product.id, name: product.name });
    }
  }

  return NextResponse.json({ deletedCount, keptCount: kept.length, kept });
}

export const POST = withErrorHandling(postHandler);
