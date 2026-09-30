import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/prospects/reclassify-port-grimaud
 *
 * Correction ponctuelle -- ajout du 30/09/2026. En creusant l'absence de
 * Port-Grimaud dans la liste de prospection (Krys : "ce nest pas dans la
 * liste... il faut faire la recherche complete"), on a découvert que
 * Port-Grimaud n'était pas vraiment oubliée : une vingtaine de commerces y
 * figuraient déjà, mais enregistrés sous city="Grimaud" (ajoutés avant que
 * Port-Grimaud devienne une ville indépendante de Grimaud dans
 * ServiceCity -- voir prospectSeedData.ts).
 *
 * Un simple réimport de prospectSeedData.ts ne suffit pas : l'import
 * (POST /api/admin/prospects/seed) dédoublonne sur (businessName, city), et
 * changer la ville dans le fichier seed créerait donc un DOUBLON à côté de
 * la ligne déjà en base sous l'ancienne ville, plutôt que de la corriger.
 * Cette route met donc à jour directement les lignes déjà existantes.
 *
 * Liste figée, vérifiée par géocodage (adresse réelle physiquement à Port
 * Grimaud -- place François Spoerry, Rue de l'Octogone, Place des
 * Artisans, Place du Marché, Prairies de la Mer, Les Vitrines du Soleil --
 * par opposition au vieux village perché de Grimaud) le 30/09/2026.
 * Volontairement exclus de cette liste (laissés sous "Grimaud", zone
 * incertaine ou clairement hors Port Grimaud) : "So Salade So Pizzas"
 * (Route de Collobrières, ~5,4km de Port Grimaud), "Just'in truck"
 * (Boulevard de Grimaud, ~3,3km de Port Grimaud), "Crêperie Le Boubou"
 * (Place du Cros, cœur du vieux village).
 *
 * Sans effet si rejouée : ne fait rien la deuxième fois puisque plus aucune
 * ligne ne correspond à city="Grimaud" pour ces noms après la première
 * exécution -- peut rester comme bouton dans l'admin sans risque.
 */
export const dynamic = "force-dynamic";

const BUSINESS_NAMES_TO_RECLASSIFY = [
  "La Grimaudoise",
  "La Caravelle (Caravelle Yachting)",
  "Pasta & Via",
  "Don Peppe",
  "La Table du Mareyeur",
  "La Provençale & Paul",
  "La Marée",
  "Le Grand Pin",
  "Lou Gâté",
  "Le Petit Bain",
  "Yeellow Smash Burger",
  "Pohmaë Poke Bowl Port Grimaud",
  "Pizza Italia",
  "Pizza Leone",
  "Pummarola",
  "KSB Kebab Sandwich Burger",
  "Los Tacos Var",
  "Les Baigneuses",
  "Le Pic Nic",
];

async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const result = await prisma.prospect.updateMany({
    where: { city: "Grimaud", businessName: { in: BUSINESS_NAMES_TO_RECLASSIFY } },
    data: { city: "Port-Grimaud" },
  });

  return NextResponse.json({ reclassified: result.count });
}

export const POST = withErrorHandling(postHandler);
