import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Si le rider est en cours de livraison, on logue aussi un TrackingEvent
   *  pour cette commande précise (historique du trajet, utile pour litiges
   *  et pour rejouer le trajet plus tard). */
  orderId: z.string().optional(),
});

/**
 * PATCH /api/riders/me/location
 *
 * Appelée en continu par l'app Livreur (toutes les 5-10s) pendant qu'elle
 * est en ligne. Met à jour Rider.currentLat/currentLng — les apps Client et
 * Admin qui suivent cette commande/ce rider reçoivent la mise à jour
 * automatiquement via Supabase Realtime (souscription `postgres_changes`
 * sur la table Rider, filtrée sur cet id), sans code supplémentaire ici.
 *
 * Body: { lat, lng, orderId? }
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Coordonnées invalides.");
  }

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const { lat, lng, orderId } = parsed.data;

  await prisma.rider.update({
    where: { id: rider.id },
    data: { currentLat: lat, currentLng: lng, currentLocationUpdatedAt: new Date() },
  });

  if (orderId) {
    // On vérifie que cette commande est bien celle assignée à ce rider,
    // pour éviter d'injecter des points de trajet sur une commande tierce.
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && order.riderId === rider.id) {
      await prisma.trackingEvent.create({
        data: { orderId, riderId: rider.id, lat, lng },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export const PATCH = withErrorHandling(patchHandler);
