import { NextRequest, NextResponse } from "next/server";
import { UserRole, RiderStatus, VehicleType } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountSuspendedEmail, sendAccountReactivatedEmail } from "@/lib/emails/accountEmails";

/**
 * PATCH /api/admin/riders/[riderId]
 *
 * Édition des informations de gestion d'un livreur depuis l'admin
 * (véhicule, plaque, statut). Pour changer le statut PENDING -> ACTIVE/
 * BANNED en tant que validation KYC, préférer POST .../validate qui trace
 * mieux l'intention ; cette route permet toutefois de corriger un statut
 * a posteriori (ex: suspendre un livreur actif).
 */
async function patchHandler(req: NextRequest, ctx: { params: { riderId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ApiError(400, "Corps de requête invalide.");
  }

  const data: {
    vehicleType?: VehicleType;
    vehiclePlate?: string | null;
    status?: RiderStatus;
  } = {};

  if (body.vehicleType && Object.values(VehicleType).includes(body.vehicleType)) {
    data.vehicleType = body.vehicleType;
  }
  if (typeof body.vehiclePlate === "string" || body.vehiclePlate === null) {
    data.vehiclePlate = body.vehiclePlate;
  }
  if (body.status && Object.values(RiderStatus).includes(body.status)) {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Aucune donnée valide à modifier.");
  }

  const existing = await prisma.rider.findUnique({ where: { id: ctx.params.riderId } });
  if (!existing) {
    throw new ApiError(404, "Livreur introuvable.");
  }

  const rider = await prisma.rider.update({
    where: { id: ctx.params.riderId },
    data,
    include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
  });

  if (data.status && data.status !== existing.status) {
    if (data.status === RiderStatus.SUSPENDED || data.status === RiderStatus.BANNED) {
      sendAccountSuspendedEmail(rider.user.email, rider.user.firstName, "rider").catch((err) =>
        console.error("[admin riders] Échec email suspension:", err)
      );
    } else if (
      (existing.status === RiderStatus.SUSPENDED || existing.status === RiderStatus.BANNED) &&
      data.status === RiderStatus.ACTIVE
    ) {
      sendAccountReactivatedEmail(rider.user.email, rider.user.firstName, "rider").catch((err) =>
        console.error("[admin riders] Échec email réactivation:", err)
      );
    }
  }

  return NextResponse.json({
    rider: {
      ...rider,
      currentLat: rider.currentLat !== null ? Number(rider.currentLat) : null,
      currentLng: rider.currentLng !== null ? Number(rider.currentLng) : null,
      rating: rider.rating !== null ? Number(rider.rating) : null,
      totalEarnings: Number(rider.totalEarnings),
      balance: Number(rider.balance),
    },
  });
}

export const PATCH = withErrorHandling(patchHandler);
