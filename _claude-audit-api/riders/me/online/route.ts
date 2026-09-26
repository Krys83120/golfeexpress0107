import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const onlineSchema = z.object({ isOnline: z.boolean() });

/**
 * PATCH /api/riders/me/online
 * Body: { isOnline: boolean }
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const parsed = onlineSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "isOnline (boolean) requis.");
  }

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }
  if (parsed.data.isOnline && rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(403, "Votre compte doit être validé avant de pouvoir passer en ligne.");
  }

  const updated = await prisma.rider.update({
    where: { id: rider.id },
    data: { isOnline: parsed.data.isOnline },
  });

  return NextResponse.json({ rider: updated });
}

export const PATCH = withErrorHandling(patchHandler);
