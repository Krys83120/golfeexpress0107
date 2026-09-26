import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  isPausedByAdmin: z.boolean(),
  adminPauseNote: z.string().trim().max(500).nullable().optional(),
});

/**
 * GET/PATCH /api/admin/pros/[proId]/pause
 *
 * Pause "test / développement" d'un Pro, déclenchée UNIQUEMENT depuis
 * l'admin (ADMIN/SUPER_ADMIN) — distincte du statut ProStatus (le Pro reste
 * ACTIVE, visible et consultable par les clients) et distincte de la
 * fermeture manuelle que le Pro contrôle lui-même depuis ses Réglages (voir
 * PATCH /api/pros/me/closure) : celle-ci, le Pro ne peut jamais la lever.
 *
 * Prime sur tout le reste dans computeOpenStatus (voir
 * apps/api/src/lib/openingHours.ts) et bloque la création de commandes côté
 * serveur (voir POST /api/orders) tant qu'elle est active — pensée pour
 * éviter qu'un client ne commande par hasard chez un Pro tout juste validé,
 * pendant que la plateforme est encore en développement/test (14/09/2026).
 *
 * Route volontairement autonome (ne dépend d'aucune autre route admin) :
 * elle lit et écrit uniquement isPausedByAdmin/adminPauseNote.
 */
async function getHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pro = await prisma.pro.findUnique({
    where: { id: params.proId },
    select: { id: true, businessName: true, isPausedByAdmin: true, adminPauseNote: true },
  });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  return NextResponse.json(pro);
}

async function patchHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pro = await prisma.pro.findUnique({ where: { id: params.proId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const json = await req.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    throw new ApiError(400, parsedBody.error.errors[0]?.message ?? "Requête invalide.");
  }

  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: {
      isPausedByAdmin: parsedBody.data.isPausedByAdmin,
      adminPauseNote: parsedBody.data.isPausedByAdmin ? parsedBody.data.adminPauseNote ?? null : null,
    },
    select: { id: true, businessName: true, isPausedByAdmin: true, adminPauseNote: true },
  });

  return NextResponse.json(updated);
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
