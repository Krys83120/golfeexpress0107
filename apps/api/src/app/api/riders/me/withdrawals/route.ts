import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendWithdrawalTransferFailedAlert } from "@/lib/emails/adminEmails";

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
 * Demande de retrait du solde disponible. Correctif du 23/09/2026 (suite à
 * l'audit sécurité/finance) : la version précédente créait la demande et
 * débitait le solde du livreur, mais ne déclenchait jamais de vrai
 * virement -- l'argent restait indéfiniment "en attente" côté plateforme
 * sans jamais atteindre le livreur (voir l'ancien TODO ici même).
 *
 * Reprend maintenant exactement le même schéma que le virement automatique
 * appliqué à la livraison d'une commande (voir
 * orders/[orderId]/status/route.ts) :
 *  1. Compte Stripe Connect requis et prêt à recevoir un virement AVANT même
 *     de pouvoir demander un retrait -- on ne reproduit jamais le bug
 *     corrigé ici (solde débité sans aucune possibilité de faire partir
 *     l'argent).
 *  2. Une seule demande PENDING active à la fois par livreur.
 *  3. Virement Stripe réel déclenché juste après la création de la demande,
 *     best-effort et hors transaction DB (un souci réseau Stripe ne doit
 *     jamais rester silencieux, mais ne doit pas non plus faire échouer la
 *     demande déjà enregistrée côté DB).
 *  4. Échec du virement -> la demande reste PENDING (le solde déjà débité
 *     n'est pas remis, l'argent reste dû) + alerte admin immédiate, à
 *     régulariser manuellement. Jamais un solde débité sans suite ni sans
 *     personne prévenue.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  const parsed = requestWithdrawalSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: auth.userId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  // Compte Stripe Connect prêt à recevoir un virement -- même garde-fou que
  // riderReadyForPayout dans orders/[orderId]/status/route.ts. Sans ça, on
  // reproduirait exactement le bug corrigé ici : un solde débité sans
  // aucune possibilité de faire partir l'argent. On bloque donc la demande
  // à la source plutôt que de la laisser échouer après coup.
  if (!rider.stripeAccountId || !rider.stripePayoutsEnabled) {
    throw new ApiError(
      400,
      "Votre compte bancaire Stripe n'est pas encore configuré ou vérifié — terminez votre inscription bancaire avant de demander un retrait."
    );
  }

  // Une seule demande de retrait active à la fois -- évite d'empiler des
  // demandes PENDING (double-clic, ou nouvelle demande avant que la
  // précédente soit résolue suite à un échec de virement, voir plus bas).
  const existingPending = await prisma.withdrawal.findFirst({
    where: { riderId: rider.id, status: "PENDING" },
  });
  if (existingPending) {
    throw new ApiError(
      409,
      "Vous avez déjà une demande de retrait en cours -- attendez qu'elle soit traitée avant d'en faire une nouvelle."
    );
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

  // Virement Stripe Connect réel -- best-effort, hors transaction, même
  // principe que les virements Pro/Rider déclenchés à la livraison d'une
  // commande : un souci Stripe ponctuel ne doit jamais rester silencieux,
  // mais ne doit pas non plus faire échouer la demande déjà enregistrée
  // côté DB (le livreur garde sa demande PENDING, rien n'est perdu).
  let responseStatus: string = withdrawal.status;
  let processedAt: Date | null = null;

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "eur",
      destination: rider.stripeAccountId,
      metadata: { withdrawalId: withdrawal.id, riderId: rider.id },
    });
    processedAt = new Date();
    responseStatus = "COMPLETED";
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: "COMPLETED", processedAt, stripeTransferId: transfer.id },
    });
  } catch (err) {
    console.error(`[riders/me/withdrawals] Échec virement Stripe pour retrait ${withdrawal.id}:`, err);
    sendWithdrawalTransferFailedAlert(
      `${rider.user.firstName} ${rider.user.lastName}`,
      amount,
      err instanceof Error ? err.message : "Erreur inconnue"
    ).catch(() => {});
  }

  return NextResponse.json(
    {
      withdrawal: {
        id: withdrawal.id,
        amount: Number(withdrawal.amount),
        status: responseStatus,
        createdAt: withdrawal.createdAt,
        processedAt,
      },
    },
    { status: 201 },
  );
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
