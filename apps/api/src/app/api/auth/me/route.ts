import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/me
 *
 * Header: Authorization: Bearer <accessToken>
 * Réponse 200: { user, profile } où `profile` est le Client/Pro/Rider/Admin
 * associé selon le rôle de l'utilisateur — c'est cette forme que consomment
 * directement les 4 apps après connexion.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      clientProfile: true,
      proProfile: true,
      riderProfile: true,
      adminProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "Utilisateur introuvable.");
  }

  const { clientProfile, proProfile, riderProfile, adminProfile, ...userBase } = user;
  const profile = clientProfile ?? proProfile ?? riderProfile ?? adminProfile ?? null;

  return NextResponse.json({ user: userBase, profile });
}

const updateMeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatar: z.string().nullable().optional(),
});

/**
 * PATCH /api/auth/me
 *
 * Met à jour les champs de base de public."User" — utilisé notamment pour
 * l'avatar (photo de profil), commun aux 4 rôles. Volontairement restreint
 * à firstName/lastName/avatar : email/phone/role changent via des flows
 * dédiés (vérification, validation admin) plutôt qu'une simple édition libre.
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: parsed.data,
  });

  return NextResponse.json({ user });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
