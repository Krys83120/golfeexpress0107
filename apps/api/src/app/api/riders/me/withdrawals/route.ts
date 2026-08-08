import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/riders/me/withdrawals — historique des demandes de retrait. */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const withdrawals = await prisma.withdrawal.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: Number(w.amount),
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
    })),
  });
}

const requestWithdrawalSchema = z.object({
  amount: z.number().positive("Le montant doit être positif."),
});

/**
 * POST /api/riders/me/withdrawals
 *
 * Demande de retrait du solde disponible. Pas de vraie intégration bancaire
 * pour ce premier jet (pas de virement SEPA déclenché) : on crée la ligne
 * Withdrawal en PENDING et on débite immédiatement Rider.balance, dans une
 * transaction pour éviter qu'un retrait double-clique ne débite deux fois.
 * TODO: brancher un vrai virement (ex: Stripe Connect payouts) qui fera
 * passer le statut à PROCESSING puis COMPLETED via webhook.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const parsed = requestWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const { amount } = parsed.data;
  if (amount > Number(rider.balance)) {
    throw new ApiError(400, "Le montant demandé dépasse votre solde disponible.");
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
    const created = await tx.withdrawal.create({
      data: { riderId: rider.id, amount, iban: rider.iban, status: "PENDING" },
    });
    await tx.rider.update({
      where: { id: rider.id },
      data: { balance: { decrement: amount } },
    });
    return created;
  });

  return NextResponse.json(
    {
      withdrawal: {
        id: withdrawal.id,
        amount: Number(withdrawal.amount),
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
        processedAt: withdrawal.processedAt,
      },
    },
    { status: 201 },
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
