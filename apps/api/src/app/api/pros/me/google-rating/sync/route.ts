import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/pros/me/google-rating/sync
 *
 * Récupère la note Google Avis actuelle du commerçant via l'API Google
 * Places (Place Details) et la met en cache en base (googleRating,
 * googleRatingCount, googleRatingSyncedAt) plutôt que d'appeler Google à
 * chaque affichage — l'API Google Places est payante à l'appel, mieux vaut
 * ne synchroniser qu'à la demande du Pro (bouton "Actualiser") ou via un
 * cron peu fréquent (ex: 1x/jour) plutôt qu'en direct.
 *
 * Nécessite la variable d'environnement GOOGLE_PLACES_API_KEY (voir
 * https://console.cloud.google.com/google/maps-apis — activer "Places API",
 * créer une clé API restreinte à cette API).
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  if (!pro.googlePlaceId) {
    throw new ApiError(400, "Renseignez d'abord votre identifiant de fiche Google (Place ID) dans vos réglages.");
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new ApiError(
      503,
      "La synchronisation Google Avis n'est pas encore configurée côté serveur (clé API Google manquante)."
    );
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    pro.googlePlaceId
  )}&fields=rating,user_ratings_total&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    throw new ApiError(
      400,
      `Impossible de récupérer les avis Google (${data.status}). Vérifiez que le Place ID est correct.`
    );
  }

  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: {
      googleRating: data.result.rating ?? null,
      googleRatingCount: data.result.user_ratings_total ?? null,
      googleRatingSyncedAt: new Date(),
    },
  });

  return NextResponse.json({
    googleRating: updated.googleRating !== null ? Number(updated.googleRating) : null,
    googleRatingCount: updated.googleRatingCount,
    googleRatingSyncedAt: updated.googleRatingSyncedAt,
  });
}

export const POST = withErrorHandling(postHandler);
