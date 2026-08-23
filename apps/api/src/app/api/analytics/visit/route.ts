import { NextRequest, NextResponse } from "next/server";
import { AppSource } from "@golfeexpress/types";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const APP_SOURCES = Object.values(AppSource) as string[];
const MAX_FIELD_LENGTH = 300;
const KNOWN_DEVICE_TYPES = new Set(["mobile", "desktop", "unknown"]);

/** Détection très simple mobile/desktop à partir du User-Agent -- suffisant pour une répartition indicative, pas une identification précise du device. */
function inferDeviceType(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent) ? "mobile" : "desktop";
}

function truncate(value: string): string {
  return value.slice(0, MAX_FIELD_LENGTH);
}

/**
 * POST /api/analytics/visit (public, pas d'auth requise)
 *
 * Point d'entrée unique de la fonctionnalité "statistiques de visites" (voir
 * GET /api/admin/analytics/visits pour la lecture agrégée côté admin) --
 * appelé par le site vitrine (une fois par page vue, voir
 * apps/www/src/components/VisitTracker.tsx) et par les 3 apps authentifiées
 * (une fois par lancement d'app). Entièrement anonyme par conception :
 * aucune auth, aucun lien vers un compte -- voir model AppVisit pour le
 * détail. Ne renvoie jamais d'erreur bloquante côté appelant pour un souci
 * de tracking (les appelants avalent déjà les erreurs réseau de leur côté),
 * mais on valide quand même le payload pour ne pas polluer la table avec des
 * données incohérentes.
 */
async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }

  const { app, sessionId, path, deviceType, referrer } = body as {
    app?: string;
    sessionId?: string;
    path?: string;
    deviceType?: string;
    referrer?: string;
  };

  if (!app || !APP_SOURCES.includes(app)) {
    throw new ApiError(400, "Application source invalide.");
  }
  if (!sessionId || typeof sessionId !== "string" || !sessionId.trim()) {
    throw new ApiError(400, "sessionId requis.");
  }

  const resolvedDeviceType =
    deviceType && KNOWN_DEVICE_TYPES.has(deviceType) ? deviceType : inferDeviceType(req.headers.get("user-agent"));

  await prisma.appVisit.create({
    data: {
      app: app as AppSource,
      sessionId: truncate(sessionId.trim()),
      path: path ? truncate(path.trim()) : null,
      deviceType: resolvedDeviceType,
      referrer: referrer ? truncate(referrer.trim()) : null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export const POST = withErrorHandling(postHandler);
