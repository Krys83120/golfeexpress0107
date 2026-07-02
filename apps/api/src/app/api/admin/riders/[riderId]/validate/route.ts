import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const validateSchema = z.object({ approve: z.boolean() });

/**
 * POST /api/admin/riders/[riderId]/validate
 * Body: { approve: boolean }
 *
 * approve=true  -> status passe à ACTIVE (le livreur peut passer en ligne)
 * approve=false -> status passe à BANNED (rejeté)
 */
async function postHandler(req: NextRequest, ctx: { params: { riderId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'approve' (boolean) requis.");
  }

  const rider = await prisma.rider.findUnique({ where: { id: ctx.params.riderId } });
  if (!rider) {
    throw new ApiError(404, "Livreur introuvable.");
  }
  if (rider.status !== RiderStatus.PENDING) {
    throw new ApiError(400, "Ce livreur n'est pas en attente de validation.");
  }

  const updated = await prisma.rider.update({
    where: { id: rider.id },
    data: { status: parsed.data.approve ? RiderStatus.ACTIVE : RiderStatus.BANNED },
  });

  return NextResponse.json({ rider: updated });
}

export const POST = withErrorHandling(postHandler);
