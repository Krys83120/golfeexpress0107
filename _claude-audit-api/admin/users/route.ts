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
    take: 200,
  });

  return NextResponse.json({ users });
}

export const GET = withErrorHandling(getHandler);
