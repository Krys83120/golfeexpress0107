import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { computeOpenStatus } from "@/lib/openingHours";

const PRO_CATEGORIES = [
  "RESTAURANT",
  "BOULANGERIE",
  "BOUCHERIE",
  "EPICERIE",
  "PHARMACIE",
  "FLEURISTE",
  "LIBRAIRIE",
  "PARFUMERIE",
  "AUTRE",
] as const;
const categoryQuerySchema = z.enum(PRO_CATEGORIES);

/**
 * GET /api/pros
 *
 * Liste publique des commerçants actifs — c'est cette route qui alimente
 * l'écran Accueil de l'app Client (sections "En vedette" / "Près de chez
 * vous"). Pas d'authentification requise : un visiteur non connecté doit
 * pouvoir parcourir le catalogue avant de créer un compte.
 *
 * Query params optionnels:
 *   ?category=RESTAURANT
 *   ?city=Sainte-Maxime
 */
async function getHandler(req: NextRequest) {
  const categoryParam = req.nextUrl.searchParams.get("category");
  const city = req.nextUrl.searchParams.get("city");

  const categoryResult = categoryParam ? categoryQuerySchema.safeParse(categoryParam) : null;
  const category = categoryResult?.success ? categoryResult.data : undefined;

  const pros = await prisma.pro.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category } : {}),
      ...(city ? { addresses: { some: { city } } } : {}),
    },
    include: {
      addresses: true,
      openingHours: true,
    },
    orderBy: [{ subscriptionType: "desc" }, { rating: "desc" }],
    take: 50,
  });

  // Sérialisation en LISTE BLANCHE explicite (corrigé le 23/08/2026, audit
  // SEO/GEO) -- avant, un "...p" renvoyait l'objet Prisma complet sur cette
  // route PUBLIQUE sans authentification, exposant siret, kbisUrl,
  // managerFirstName/LastName, vatNumber, termsAcceptedAt/Version,
  // rejectionReason, commissionRate exact, et tous les identifiants Stripe
  // (compte, abonnement, statut) à n'importe quel visiteur non connecté.
  // Le type partagé `Pro` (@golfeexpress/types) sert AUSSI à la vue privée
  // authentifiée du commerçant sur lui-même (GET /api/pros/me), qui a
  // légitimement besoin de ces champs -- cette route-ci ne doit renvoyer que
  // ce qui est vérifié comme réellement consommé par les apps Client/www
  // (voir apps/client/src/services/prosApi.ts, BusinessInfoCard.tsx,
  // ProDetailScreen.tsx) : aucun des champs exclus ci-dessous n'y est lu.
  const serialized = pros.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    description: p.description,
    category: p.category,
    logo: p.logo,
    coverImage: p.coverImage,
    phone: p.phone,
    emailContact: p.emailContact,
    status: p.status,
    subscriptionType: p.subscriptionType,
    rating: p.rating !== null ? Number(p.rating) : null,
    ratingCount: p.ratingCount,
    googleRating: p.googleRating !== null ? Number(p.googleRating) : null,
    googleRatingCount: p.googleRatingCount,
    instagramUrl: p.instagramUrl,
    facebookUrl: p.facebookUrl,
    tiktokUrl: p.tiktokUrl,
    websiteUrl: p.websiteUrl,
    defaultPrepTimeMinutes: p.defaultPrepTimeMinutes,
    pickupAddressId: p.pickupAddressId,
    isManuallyClosed: p.isManuallyClosed,
    manualClosureReason: p.manualClosureReason,
    manualClosureUntil: p.manualClosureUntil,
    manualClosureNote: p.manualClosureNote,
    addresses: p.addresses.map((a) => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) })),
    openingHours: p.openingHours,
    // Calculé côté serveur (jamais côté client, pour éviter tout décalage de
    // fuseau horaire) — alimente le badge Ouvert/Fermé/En vacances côté
    // Client (voir apps/client/src/services/prosApi.ts).
    openStatus: computeOpenStatus(p.openingHours, {
      isManuallyClosed: p.isManuallyClosed,
      manualClosureReason: p.manualClosureReason,
      manualClosureUntil: p.manualClosureUntil,
      manualClosureNote: p.manualClosureNote,
    }),
  }));

  return NextResponse.json({ pros: serialized });
}

export const GET = withErrorHandling(getHandler);
