import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/pros/me/verify-siret
 * Body: { siret: string }
 *
 * Vérifie qu'un SIRET correspond bien à une entreprise réellement
 * enregistrée, via l'API publique française "Recherche d'Entreprises"
 * (recherche-entreprises.api.gouv.fr) — gratuite, sans clé API, alimentée
 * par les données officielles de l'INSEE/Sirene. Empêche un Pro d'entrer
 * un numéro inventé à l'inscription.
 *
 * Ne bloque QUE le format et l'existence du SIRET — ne fait PAS de
 * vérification d'identité/KYC complète (ça reste un contrôle humain via le
 * statut ProStatus.PENDING -> ACTIVE côté admin).
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const body = await req.json().catch(() => null);
  const siret = typeof body?.siret === "string" ? body.siret.replace(/\s/g, "") : null;

  if (!siret || !/^\d{14}$/.test(siret)) {
    throw new ApiError(400, "Le SIRET doit contenir exactement 14 chiffres.");
  }

  const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}`);
  if (!response.ok) {
    throw new ApiError(502, "Le service de vérification SIRET est momentanément indisponible.");
  }

  const data = await response.json();
  const result = data.results?.find((r: { siege?: { siret?: string } }) => r.siege?.siret === siret);

  if (!result) {
    return NextResponse.json({
      valid: false,
      message: "Aucune entreprise trouvée pour ce SIRET. Vérifiez le numéro saisi.",
    });
  }

  // On enregistre le résultat de la vérification (mais on ne bloque pas
  // l'enregistrement du SIRET lui-même — c'est fait via PATCH /api/pros/me
  // normalement, cette route ne fait QUE vérifier + informer côté UI).
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (pro && pro.siret === siret) {
    await prisma.pro.update({
      where: { id: pro.id },
      data: { siretVerified: true, siretVerifiedAt: new Date() },
    });
  }

  return NextResponse.json({
    valid: true,
    businessName: result.nom_complet ?? result.nom_raison_sociale,
    legalForm: result.nature_juridique ?? null,
    address: result.siege?.adresse ?? null,
  });
}

export const POST = withErrorHandling(postHandler);
