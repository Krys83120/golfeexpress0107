import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/reviews/platform
 *
 * Avis clients sur l'application Do You Geckoo elle-même (pas un
 * commerçant ni un livreur en particulier) -- volet `platform` de Review,
 * jusqu'ici enregistré en base mais jamais consulté nulle part. Accès à
 * TOUS les avis (visibles ou masqués), réservé à l'admin : il n'y a pas de
 * "fiche plateforme" publique équivalente à une fiche commerçant/livreur.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN]);

  const reviews = await prisma.review.findMany({
    where: { platformRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
