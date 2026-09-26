import { NextRequest, NextResponse } from "next/server";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { buildReceiptPdf } from "@/lib/pdf/receipt";
import { loadOrderForReceipt, toReceiptData } from "@/lib/receiptData";

/**
 * GET /api/orders/[orderId]/receipt
 *
 * Ticket de commande en PDF — accessible au client qui a passé la
 * commande, au Pro qui l'a reçue, ou à un admin (voir loadOrderForReceipt).
 * Utilisé pour le téléchargement direct côté app ; voir aussi
 * /receipt/send pour l'envoi par email — traçabilité/archivage demandés
 * côté client comme côté Pro.
 */
async function getHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req);
  const order = await loadOrderForReceipt(ctx.params.orderId, auth);
  const pdf = await buildReceiptPdf(toReceiptData(order));

  // Buffer<ArrayBufferLike> n'est pas structurellement assignable à
  // BodyInit selon les types Next.js/@types/node de ce projet (bien qu'il
  // le soit à l'exécution) — Uint8Array l'est explicitement, sans "as any".
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ticket-${order.orderNumber}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(getHandler);
