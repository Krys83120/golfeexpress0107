import { NextRequest, NextResponse } from "next/server";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST/DELETE /api/pros/push-subscription
 *
 * Enregistre ou retire l'abonnement Web Push du navigateur courant pour la
 * BOUTIQUE (proId), pas pour un utilisateur précis -- voir
 * prisma/schema.prisma, ProPushSubscription, et lib/webPush.ts (sendPushToPro)
 * pour l'envoi. Ajout du 22/09/2026, demande de Krys (être notifié d'une
 * nouvelle commande même appli complètement fermée, comme les livreurs).
 *
 * `requireProOrEmployee` résout `proId` que l'appelant soit le patron ou un
 * employé (voir ProEmployee) -- chaque appareil (téléphone du patron,
 * tablette en cuisine tenue par un employé...) s'abonne individuellement,
 * et TOUS les abonnements actifs de la boutique reçoivent la notification.
 *
 * Même structure exacte que riders/push-subscription/route.ts, y compris le
 * choix de ne PAS vivre sous /pros/me/ malgré la convention habituelle --
 * même limite technique de l'outil utilisé pour développer avec Claude sur
 * ce projet (profondeur de dossiers), sans aucun impact fonctionnel : la
 * route reste protégée par requireProOrEmployee comme n'importe quelle autre
 * route Pro.
 */
async function postHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : null;
  const authKey = typeof body?.keys?.auth === "string" ? body.keys.auth : null;
  if (!endpoint || !p256dh || !authKey) {
    throw new ApiError(400, "Abonnement push invalide (endpoint/keys manquants).");
  }

  // upsert sur `endpoint` (unique) : un même navigateur qui ré-envoie son
  // abonnement (ex: après avoir rouvert l'app) ne doit jamais créer de
  // doublon -- juste rafraîchir proId/clés au cas où (changement de compte
  // sur le même appareil, rotation des clés navigateur...).
  await prisma.proPushSubscription.upsert({
    where: { endpoint },
    create: { proId, endpoint, p256dh, auth: authKey },
    update: { proId, p256dh, auth: authKey },
  });

  return NextResponse.json({ ok: true });
}

async function deleteHandler(req: NextRequest) {
  await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) {
    throw new ApiError(400, "endpoint requis.");
  }

  // Pas de vérification d'appartenance supplémentaire : `endpoint` est déjà
  // unique et généré par le navigateur lui-même (impossible à deviner pour
  // cibler l'abonnement d'une autre boutique), suppression silencieuse si
  // déjà absent (idempotent, ex: double-clic sur le réglage).
  await prisma.proPushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(postHandler);
export const DELETE = withErrorHandling(deleteHandler);
