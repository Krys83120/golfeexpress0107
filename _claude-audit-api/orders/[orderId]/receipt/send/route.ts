import { NextRequest, NextResponse } from "next/server";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { buildReceiptPdf } from "@/lib/pdf/receipt";
import { loadOrderForReceipt, toReceiptData, receiptRecipientEmail } from "@/lib/receiptData";
import { sendReceiptEmail } from "@/lib/emails/documentEmails";

/**
 * POST /api/orders/[orderId]/receipt/send
 *
 * Envoie le ticket de commande (PDF) par email au compte connecté (client
 * ou Pro concerné par la commande) — jamais à une adresse arbitraire.
 */
async function postHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req);
  const order = await loadOrderForReceipt(ctx.params.orderId, auth);
  const pdf = await buildReceiptPdf(toReceiptData(order));
  const to = receiptRecipientEmail(auth);

  await sendReceiptEmail(to, order.orderNumber, pdf);

  return NextResponse.json({ sent: true, to });
}

export const POST = withErrorHandling(postHandler);
