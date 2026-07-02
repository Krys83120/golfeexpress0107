import { NextRequest, NextResponse } from "next/server";
import { UserRole, ProStatus, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/cities
 *
 * Dérive la liste des villes desservies à partir des adresses des Pro
 * actifs (regroupement + comptage), plutôt qu'une liste figée en dur —
 * une ville apparaît dès qu'au moins un Pro y est actif, et disparaît
 * automatiquement si plus aucun Pro n'y est présent.
 *
 * Le nombre de livreurs par ville reste approximatif : un Rider n'a pas de
 * ville de rattachement fixe dans le schéma (il se déplace), on compte ici
 * les livreurs actifs au global divisé proportionnellement — TODO: affiner
 * avec une vraie zone de couverture par ville si ce besoin devient précis.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const [activePros, activeRiderCount] = await Promise.all([
    prisma.pro.findMany({
      where: { status: ProStatus.ACTIVE },
      include: { addresses: { take: 1 } },
    }),
    prisma.rider.count({ where: { status: RiderStatus.ACTIVE } }),
  ]);

  const cityCounts = new Map<string, number>();
  for (const pro of activePros) {
    const city = pro.addresses[0]?.city;
    if (!city) continue;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  const totalPros = activePros.length;
  const cities = Array.from(cityCounts.entries())
    .map(([name, activePros]) => ({
      name,
      activePros,
      // Répartition proportionnelle simple en l'absence de zone de couverture précise.
      activeRiders: totalPros > 0 ? Math.round((activePros / totalPros) * activeRiderCount) : 0,
    }))
    .sort((a, b) => b.activePros - a.activePros);

  return NextResponse.json({ cities });
}

export const GET = withErrorHandling(getHandler);
