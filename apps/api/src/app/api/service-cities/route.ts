import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/service-cities (PUBLIC, sans authentification)
 *
 * Sous-ensemble volontairement restreint de ServiceCity, consommé par le
 * site vitrine (apps/www) pour générer les pages /livraison/[ville], le
 * sitemap, et le maillage interne (Footer, page zone de livraison).
 *
 * On expose seoIndexable en plus de isActive : les deux réglages sont
 * indépendants (voir le commentaire sur /api/admin/service-cities/[cityId])
 * pour permettre de préparer le contenu SEO d'une ville avant même que la
 * prise de commande y soit activée. C'est à l'app www de décider quoi
 * afficher/indexer selon ces deux booléens -- jamais l'inverse.
 *
 * Champs volontairement EXCLUS : sortOrder, createdAt, updatedAt (détails
 * d'implémentation interne, aucune utilité publique).
 *
 * export const dynamic = "force-dynamic" : sans ça, ce Route Handler est
 * susceptible d'être mis en cache statique au build par Next.js -- ce qui
 * figerait la liste des villes indexables au moment du build plutôt que de
 * refléter les changements faits depuis l'Admin (voir le même commentaire
 * historique dans /api/settings/branding/route.ts).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const cities = await prisma.serviceCity.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      seoIndexable: true,
      seoSlug: true,
      seoIntro: true,
      lat: true,
      lng: true,
    },
  });

  // Decimal Prisma (lat/lng) -> nombres JS, même raison que partout ailleurs
  // dans l'API (sinon sérialisés en texte côté JSON, cassant tout calcul ou
  // affichage numérique côté client).
  const serialized = cities.map((c) => ({
    ...c,
    lat: c.lat !== null ? Number(c.lat) : null,
    lng: c.lng !== null ? Number(c.lng) : null,
  }));

  return NextResponse.json({ cities: serialized });
}
