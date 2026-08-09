import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

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

  // Decimal Prisma (rating, commissionRate, addresses[].lat/lng) -> nombres
  // JS, sinon sérialisés en texte côté JSON — cassait silencieusement le
  // calcul de distance (haversine) et l'affichage de la carte côté Client.
  const serialized = pros.map((p) => ({
    ...p,
    rating: p.rating !== null ? Number(p.rating) : null,
    commissionRate: Number(p.commissionRate),
    addresses: p.addresses.map((a) => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) })),
  }));

  return NextResponse.json({ pros: serialized });
}

export const GET = withErrorHandling(getHandler);
