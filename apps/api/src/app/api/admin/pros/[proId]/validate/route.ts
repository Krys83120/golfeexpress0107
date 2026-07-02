import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, ProStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const validateSchema = z.object({ approve: z.boolean() });

/**
 * POST /api/admin/pros/[proId]/validate
 * Body: { approve: boolean }
 *
 * approve=true  -> status passe à ACTIVE (le Pro apparaît dans le catalogue public)
 * approve=false -> status passe à CLOSED (rejeté ; pas de suppression, pour
 *                  garder une trace et permettre un recours/nouvelle soumission)
 */
async function postHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'approve' (boolean) requis.");
  }

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }
  if (pro.status !== ProStatus.PENDING) {
    throw new ApiError(400, "Ce commerçant n'est pas en attente de validation.");
  }

  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: { status: parsed.data.approve ? ProStatus.ACTIVE : ProStatus.CLOSED },
  });

  return NextResponse.json({ pro: updated });
}

export const POST = withErrorHandling(postHandler);
