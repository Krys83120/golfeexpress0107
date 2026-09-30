import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/prospects (PUBLIC, sans authentification)
 *
 * Sous-ensemble très restreint de Prospect, consommé par le site vitrine
 * (apps/www) pour les pages annuaire /decouvrir/[ville] (ajout du
 * 30/09/2026, deuxième usage de la table Prospect après l'Admin >
 * Prospection). Objectif : donner du contenu local réel aux pages ville
 * même pour les commerces pas encore partenaires, sans jamais exposer les
 * données de prospection commerciale de Krys.
 *
 * Champs volontairement EXCLUS de la sérialisation ci-dessous : email,
 * phone, notes, source, tout le suivi d'email de prospection
 * (prospectingEmail*), convertedProId, createdAt/updatedAt -- aucun de ces
 * champs n'a vocation à sortir de l'Admin.
 *
 * Filtre :
 * - showOnDirectory=true (retrait immédiat possible depuis Admin, voir
 *   schema.prisma)
 * - offersTakeaway=true OU advertisesUberEats=true (le prospect doit
 *   réellement proposer à emporter ou déjà livrer ailleurs -- jamais tous
 *   les prospects sans distinction, même logique "pas de page sans
 *   contenu réel" que /api/service-cities et /api/pros)
 * - convertedAt=null : un prospect devenu vrai partenaire (compte Pro créé,
 *   voir app/api/auth/signup/route.ts) sort de cette liste -- il a
 *   maintenant sa vraie fiche /commercants/[slug] et sa place dans
 *   /livraison/[ville], plus de raison de le montrer encore comme "pas
 *   encore partenaire".
 *
 * export const dynamic = "force-dynamic" : même raison que
 * /api/service-cities -- sans ça ce Route Handler risque d'être figé au
 * build plutôt que de refléter les changements faits depuis Admin.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const prospects = await prisma.prospect.findMany({
    where: {
      showOnDirectory: true,
      convertedAt: null,
      OR: [{ offersTakeaway: true }, { advertisesUberEats: true }],
    },
    orderBy: [{ city: "asc" }, { businessName: "asc" }],
    select: {
      id: true,
      businessName: true,
      city: true,
      category: true,
      logoUrl: true,
      websiteUrl: true,
      googleMapsUrl: true,
      facebookUrl: true,
    },
  });

  return NextResponse.json({ prospects });
}
