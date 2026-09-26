import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST/DELETE /api/riders/push-subscription
 *
 * Enregistre ou retire l'abonnement Web Push du navigateur courant pour le
 * livreur connecté (voir prisma/schema.prisma, RiderPushSubscription, et
 * webPush.ts pour l'envoi). Volontairement PAS sous /riders/me/ malgré la
 * convention habituelle (voir riders/me/route.ts, riders/me/online/...) --
 * limite technique de l'outil utilisé pour développer avec Claude sur ce
 * projet (profondeur de dossiers), sans aucun impact fonctionnel : la
 * route reste protégée par le même requireAuth([UserRole.RIDER]) et résout
 * le livreur depuis le token, exactement comme les autres.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : null;
  const authKey = typeof body?.keys?.auth === "string" ? body.keys.auth : null;
  if (!endpoint || !p256dh || !authKey) {
    throw new ApiError(400, "Abonnement push invalide (endpoint/keys manquants).");
  }

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  // upsert sur `endpoint` (unique) : un même navigateur qui ré-envoie son
  // abonnement (ex: après avoir rouvert l'app) ne doit jamais créer de
  // doublon -- juste rafraîchir riderId/clés au cas où (changement de
  // compte sur le même appareil, rotation des clés navigateur...).
  await prisma.riderPushSubscription.upsert({
    where: { endpoint },
    create: { riderId: rider.id, endpoint, p256dh, auth: authKey },
    update: { riderId: rider.id, p256dh, auth: authKey },
  });

  return NextResponse.json({ ok: true });
}

async function deleteHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) {
    throw new ApiError(400, "endpoint requis.");
  }

  // Pas de vérification d'appartenance supplémentaire : `endpoint` est déjà
  // unique et généré par le navigateur lui-même (impossible à deviner pour
  // cibler l'abonnement d'un autre livreur), suppression silencieuse si
  // déjà absent (idempotent, ex: double-clic sur le réglage).
  await prisma.riderPushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(postHandler);
export const DELETE = withErrorHandling(deleteHandler);
