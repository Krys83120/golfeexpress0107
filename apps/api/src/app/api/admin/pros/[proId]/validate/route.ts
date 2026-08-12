import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, ProStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendProValidatedEmail, sendProRejectedEmail } from "@/lib/kycEmails";

const validateSchema = z.object({
  approve: z.boolean(),
  /** Requis si approve=false — transmis par email au Pro pour qu'il corrige. */
  reason: z.string().min(1).optional(),
});

/**
 * POST /api/admin/pros/[proId]/validate
 * Body: { approve: boolean, reason?: string }
 *
 * approve=true  -> status passe à ACTIVE (le Pro apparaît dans le catalogue public)
 * approve=false -> status passe à CLOSED (rejeté ; pas de suppression, pour
 *                  garder une trace et permettre un recours/nouvelle soumission)
 * Envoie un email automatique dans les deux cas (échec d'envoi non bloquant).
 */
async function postHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'approve' (boolean) requis.");
  }
  if (!parsed.data.approve && !parsed.data.reason) {
    throw new ApiError(400, "Un motif de refus est requis pour rejeter un dossier.");
  }

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId }, include: { user: true } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }
  if (pro.status !== ProStatus.PENDING) {
    throw new ApiError(400, "Ce commerçant n'est pas en attente de validation.");
  }

  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: {
      status: parsed.data.approve ? ProStatus.ACTIVE : ProStatus.CLOSED,
      rejectionReason: parsed.data.approve ? null : parsed.data.reason,
    },
  });

  if (parsed.data.approve) {
    await sendProValidatedEmail(pro.user.email, pro.businessName);
  } else {
    await sendProRejectedEmail(pro.user.email, pro.businessName, parsed.data.reason!);
  }

  return NextResponse.json({ pro: updated });
}

export const POST = withErrorHandling(postHandler);
