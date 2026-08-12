import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateRiderProfileSchema } from "@/lib/validation/riderProfile";

function serializeRider<T extends Record<string, unknown>>(rider: T) {
  const result: Record<string, unknown> = { ...rider };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value !== null && typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") {
      result[key] = (value as { toNumber: () => number }).toNumber();
    }
  }
  return result;
}

/**
 * GET /api/riders/me
 * Profil complet du livreur connecté.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  return NextResponse.json({ rider: serializeRider(rider) });
}

/**
 * PATCH /api/riders/me
 *
 * Complète le dossier livreur (KYC) : état civil, adresse, photo de
 * profil, selfie de vérification, statut professionnel, SIRET si
 * indépendant, assurance, acceptation CGU/CGV. vehicleType/vehiclePlate/
 * idCardFront/idCardBack/iban restent éditables ici aussi (déjà présents
 * avant cette extension).
 *
 * Volontairement SANS validation KYC bloquante côté serveur ici (aucune
 * vérification d'identité automatisée) — le contrôle reste humain, via le
 * statut RiderStatus.PENDING -> ACTIVE géré côté admin (voir
 * /api/admin/riders/[riderId]/validate).
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const existing = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!existing) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateRiderProfileSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const data: Record<string, unknown> = { ...parsed.data };

  // Horodatage de l'acceptation CGU/CGV côté serveur (jamais confié au
  // client) — l'IP est capturée ici, pas transmise par l'app, pour rester
  // fiable comme preuve de consentement.
  if (parsed.data.acceptTerms) {
    delete data.acceptTerms;
    data.termsAcceptedAt = new Date();
    data.termsVersion = parsed.data.termsVersion ?? "1.0";
    data.termsAcceptedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  } else {
    delete data.acceptTerms;
  }

  if (parsed.data.birthDate) {
    data.birthDate = new Date(parsed.data.birthDate);
  }

  const rider = await prisma.rider.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({ rider: serializeRider(rider) });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
