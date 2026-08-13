import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const bodySchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

/**
 * POST /api/auth/reset-password
 *
 * Vérifie le token reçu par email (haché puis comparé — jamais stocké en
 * clair) et, s'il est valide et non expiré, change réellement le mot de
 * passe côté Supabase Auth via l'API admin (seule façon de changer le mot
 * de passe d'un utilisateur sans connaître l'ancien).
 */
async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { token, newPassword } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "Ce lien de réinitialisation est invalide ou a expiré. Refaites une demande.");
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(resetToken.userId, { password: newPassword });
  if (error) {
    throw new ApiError(500, "Impossible de mettre à jour le mot de passe. Réessayez.");
  }

  // Le token est à usage unique — on le marque utilisé plutôt que de le
  // supprimer, pour garder une trace en cas d'investigation.
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ message: "Mot de passe mis à jour avec succès." });
}

export const POST = withErrorHandling(postHandler);
