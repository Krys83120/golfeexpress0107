import { NextRequest, NextResponse } from "next/server";
import { UserRole, ProStatus, ProCategory } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountSuspendedEmail, sendAccountReactivatedEmail } from "@/lib/emails/accountEmails";

/**
 * PATCH /api/admin/pros/[proId]
 *
 * Édition des informations de gestion d'un commerçant depuis l'admin,
 * pendant la revue de son dossier (raison sociale, forme juridique,
 * TVA, gérant, statut). Miroir de PATCH /api/admin/riders/[riderId].
 */
async function patchHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ApiError(400, "Corps de requête invalide.");
  }

  const data: Record<string, unknown> = {};
  const stringFields = [
    "businessName",
    "legalName",
    "legalForm",
    "vatNumber",
    "managerFirstName",
    "managerLastName",
    "phone",
    "emailContact",
  ] as const;

  for (const field of stringFields) {
    if (typeof body[field] === "string" || body[field] === null) {
      data[field] = body[field];
    }
  }
  if (body.category && Object.values(ProCategory).includes(body.category)) {
    data.category = body.category;
  }
  if (body.status && Object.values(ProStatus).includes(body.status)) {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Aucune donnée valide à modifier.");
  }

  const existing = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!existing) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const pro = await prisma.pro.update({
    where: { id: ctx.params.proId },
    data,
    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, addresses: true },
  });

  // Email de suspension/réactivation — uniquement si le statut a réellement
  // changé vers/depuis SUSPENDED (pas à chaque édition anodine du dossier).
  if (data.status && data.status !== existing.status) {
    if (data.status === ProStatus.SUSPENDED) {
      sendAccountSuspendedEmail(pro.user.email, pro.user.firstName, "pro").catch((err) =>
        console.error("[admin pros] Échec email suspension:", err)
      );
    } else if (existing.status === ProStatus.SUSPENDED && data.status === ProStatus.ACTIVE) {
      sendAccountReactivatedEmail(pro.user.email, pro.user.firstName, "pro").catch((err) =>
        console.error("[admin pros] Échec email réactivation:", err)
      );
    }
  }

  return NextResponse.json({
    pro: {
      ...pro,
      commissionRate: Number(pro.commissionRate),
      rating: pro.rating !== null ? Number(pro.rating) : null,
      googleRating: pro.googleRating !== null ? Number(pro.googleRating) : null,
      addresses: pro.addresses.map((a) => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) })),
    },
  });
}

export const PATCH = withErrorHandling(patchHandler);
