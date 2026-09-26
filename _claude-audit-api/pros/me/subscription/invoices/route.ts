import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import type { SubscriptionInvoice } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/pros/me/subscription/invoices
 *
 * Historique des factures Stripe du Pro connecté (pack partenaire) — lu à
 * la volée depuis l'API Stripe, jamais stocké en base. Alimente la section
 * "Mes factures" de l'écran Abonnement côté apps/pro, pour que le Pro
 * retrouve ses factures sans avoir à fouiller ses emails ou le Billing
 * Portal.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  // Pas encore de Customer Stripe (jamais souscrit à un pack payant) : pas
  // d'erreur, juste une liste vide — cas normal pour un Pro toujours en FREE.
  if (!pro.stripeCustomerId) {
    return NextResponse.json({ invoices: [] satisfies SubscriptionInvoice[] });
  }

  const stripeInvoices = await stripe.invoices.list({ customer: pro.stripeCustomerId, limit: 24 });

  const invoices: SubscriptionInvoice[] = stripeInvoices.data.map((inv) => ({
    id: inv.id,
    createdAt: new Date(inv.created * 1000).toISOString(),
    amount: inv.amount_paid / 100,
    status: inv.status ?? "unknown",
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdfUrl: inv.invoice_pdf ?? null,
  }));

  return NextResponse.json({ invoices });
}

export const GET = withErrorHandling(getHandler);
