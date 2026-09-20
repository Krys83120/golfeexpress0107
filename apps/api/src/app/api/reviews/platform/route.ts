import { NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reviews/platform
 *
 * Endpoint PUBLIC (pas de requireAuth) -- renvoie la liste des avis clients
 * visibles sur l'application Do You Geckoo elle-même (volet `platform` de
 * Review, isVisible uniquement), du plus récent au plus ancien. Alimente la
 * page /avis du site vitrine (voir apps/www/src/app/avis/page.tsx).
 *
 * Complète GET /api/reviews/platform-stats (qui ne renvoie que la moyenne +
 * le nombre total) en donnant le détail affichable de chaque avis. Un avis
 * ici est TOUJOURS un "achat vérifié" par construction : Review.orderId est
 * une contrainte @unique vers une commande réellement passée par ce client
 * (voir POST /api/orders/[orderId]/review) -- il n'existe aucun moyen de
 * laisser un avis platformRating sans commande réelle associée, donc aucun
 * champ "vérifié" séparé n'est nécessaire ici.
 *
 * Limité à 50 avis les plus récents : cette page n'a pas vocation à
 * paginer l'historique complet, seulement à donner un aperçu représentatif
 * (voir aussi platform-stats pour la moyenne/le total réels, qui eux ne
 * sont jamais tronqués).
 *
 * `export const dynamic = "force-dynamic"` OBLIGATOIRE -- même bug que
 * /api/partner-packs et /api/reviews/platform-stats (corrigé le 19/09/2026
 * en même temps, voir le commentaire détaillé sur /api/partner-packs) :
 * sans lecture de header/searchParams/cookie, Next.js traiterait sinon ce
 * handler comme statique et figerait la liste des avis affichés sur /avis
 * au moment du dernier déploiement.
 */
export const dynamic = "force-dynamic";

async function getHandler() {
  const reviews = await prisma.review.findMany({
    where: { platformRating: { not: null }, isVisible: true },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      platformRating: true,
      platformComment: true,
      createdAt: true,
      client: {
        select: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.platformRating,
      comment: r.platformComment,
      createdAt: r.createdAt,
      firstName: r.client.user.firstName,
      // Seule l'initiale du nom est exposée ici (jamais le nom complet) --
      // ces avis sont affichés publiquement, sans compte requis pour les
      // consulter, sur la page vitrine /avis.
      lastInitial: r.client.user.lastName ? r.client.user.lastName.charAt(0).toUpperCase() : null,
    })),
  });
}

export const GET = withErrorHandling(getHandler);
