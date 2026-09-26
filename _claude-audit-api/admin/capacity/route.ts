import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { getAvailableRidersCount, getOnlineRidersCount } from "@/lib/capacitySettings";

/**
 * GET /api/admin/capacity
 *
 * Photo instantanée de la capacité de livraison, pour le petit indicateur
 * du Dashboard (voir CapacityStatusCard.tsx) — permet à l'admin de voir
 * venir un blocage ("Vérification de disponibilité livreurs" dans Admin >
 * Zones & Capacité) AVANT qu'un client le rencontre au moment de commander.
 *
 * availableRidersCount utilise EXACTEMENT la même requête que le
 * garde-fou réel (voir isRiderCheckEnabled + le bloc correspondant dans
 * orders/route.ts) : ce chiffre doit toujours refléter la vérité de ce qui
 * bloquera ou non une commande, jamais une approximation différente.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const [onlineRidersCount, availableRidersCount] = await Promise.all([
    getOnlineRidersCount(),
    getAvailableRidersCount(),
  ]);

  return NextResponse.json({ onlineRidersCount, availableRidersCount });
}

export const GET = withErrorHandling(getHandler);
