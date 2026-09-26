import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/emails/authEmails";
import { PORTAL_URLS } from "@/lib/emails/shared";
import { enforceRateLimit } from "@/lib/rateLimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

const bodySchema = z.object({ email: z.string().email() });

function portalUrlForRole(role: UserRole): string {
  switch (role) {
    case UserRole.PRO:
      return PORTAL_URLS.pro;
    case UserRole.RIDER:
      return PORTAL_URLS.rider;
    case UserRole.ADMIN:
    case UserRole.SUPER_ADMIN:
      return PORTAL_URLS.admin;
    default:
      return PORTAL_URLS.client;
  }
}

/**
 * POST /api/auth/forgot-password
 *
 * Génère un token de réinitialisation (haché en base, jamais stocké en
 * clair) et envoie un email avec le lien correspondant. Répond TOUJOURS
 * avec le même message générique, que l'email corresponde à un compte ou
 * non — ne jamais révéler si une adresse est enregistrée (énumération de
 * comptes = faille de sécurité classique).
 */
async function postHandler(req: NextRequest) {
  // Rate limiting (23/09/2026, audit sécurité) : 3 demandes / heure / IP --
  // empêche de spammer la boîte mail de quelqu'un avec des liens de
  // réinitialisation (email bombing), tout en laissant assez de marge pour
  // une vraie personne qui retape mal son email une ou deux fois.
  await enforceRateLimit(req, { route: "forgot-password", limit: 3, windowMs: 60 * 60 * 1000 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Adresse email invalide.");
  }

  const GENERIC_MESSAGE = "Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.";

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${portalUrlForRole(user.role as UserRole)}?reset_token=${rawToken}`;
  await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

  return NextResponse.json({ message: GENERIC_MESSAGE });
}

export const POST = withErrorHandling(postHandler);
