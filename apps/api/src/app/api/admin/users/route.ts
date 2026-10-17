import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const ROLE_VALUES = ["CLIENT", "PRO", "RIDER", "ADMIN", "SUPER_ADMIN"] as const;
const roleQuerySchema = z.enum(ROLE_VALUES);

/**
 * GET /api/admin/users
 *
 * Liste tous les utilisateurs (tous rôles confondus) pour la vue admin
 * "Utilisateurs". Query params optionnels :
 *   ?role=CLIENT (filtre par rôle)
 *   ?search=sophie (recherche sur prénom/nom/email)
 *
 * Renvoie aussi, pour l'admin uniquement : signupIp (IP d'inscription) et
 * postalAddress (adresse postale principale connue, ou null).
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const roleParam = req.nextUrl.searchParams.get("role");
  const search = req.nextUrl.searchParams.get("search");

  const roleResult = roleParam ? roleQuerySchema.safeParse(roleParam) : null;
  const role = roleResult?.success ? roleResult.data : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      addresses: { orderBy: { isDefault: "desc" }, take: 1 },
      riderProfile: { select: { street: true, zipCode: true, city: true } },
      proProfile: { select: { addresses: { orderBy: { isDefault: "desc" }, take: 1 } } },
    },
  });

  // Adresse postale principale : celle du dossier livreur si renseignée,
  // sinon l'adresse enregistrée du compte (client), sinon celle du commerce.
  const result = users.map(({ addresses, riderProfile, proProfile, ...user }) => {
    const parts: (string | null | undefined)[] = riderProfile?.street
      ? [riderProfile.street, [riderProfile.zipCode, riderProfile.city].filter(Boolean).join(" ")]
      : (() => {
          const a = addresses[0] ?? proProfile?.addresses[0];
          return a ? [a.street, a.complement, [a.zipCode, a.city].filter(Boolean).join(" ")] : [];
        })();
    const postalAddress = parts.filter(Boolean).join(", ") || null;
    return { ...user, postalAddress };
  });

  return NextResponse.json({ users: result });
}

export const GET = withErrorHandling(getHandler);
