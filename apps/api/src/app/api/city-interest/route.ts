import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { cityInterestSchema } from "@/lib/validation/cityInterest";
import { sendCityInterestAlert, sendCityInterestConfirmation } from "@/lib/emails/cityInterestEmails";

/**
 * POST /api/city-interest (public, pas d'auth requise) -- formulaire
 * "Prévenez-moi" affiché sur /livraison/[ville] (site vitrine, apps/www)
 * quand une ville n'a encore aucun commerçant actif. Même mécanisme de
 * rate limiting que POST /api/contact (endpoint public, le plus exposé au
 * spam) -- voir lib/rateLimit.ts.
 */
async function postHandler(req: NextRequest) {
  await enforceRateLimit(req, { route: "city-interest", limit: 5, windowMs: 60 * 60 * 1000 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const parsed = cityInterestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Requête invalide.");
  }
  const { email, cityName } = parsed.data;

  await sendCityInterestAlert({ email, cityName });
  await sendCityInterestConfirmation(email, cityName);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export const POST = withErrorHandling(postHandler);
