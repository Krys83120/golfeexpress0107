import { sendEmail, emailShell, button, infoBox, formatEuros, PORTAL_URLS } from "./shared";

interface OrderEmailItem {
  productName: string;
  quantity: number;
  totalPrice: number;
}

interface OrderEmailData {
  orderNumber: string;
  total: number;
  proBusinessName: string;
  items?: OrderEmailItem[];
  /** Utilisé pour deep-linker vers l'écran de notation (voir sendOrderDeliveredEmail) — optionnel pour ne pas casser les appels existants qui n'en ont pas besoin. */
  orderId?: string;
  /** Code à communiquer au livreur pour valider la remise — voir Order.deliveryCode. */
  deliveryCode?: string | null;
}

const TRACKING_URL = `${PORTAL_URLS.client}?tab=orders`;

// ==================== CLIENT ====================

/** Envoyé quand le paiement est confirmé (webhook Stripe payment_intent.succeeded). */
export async function sendOrderConfirmedEmail(email: string, order: OrderEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">✅ Commande confirmée</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre commande <strong>${order.orderNumber}</strong> chez <strong>${order.proBusinessName}</strong> est
      confirmée, le paiement de <strong>${formatEuros(order.total)}</strong> a bien été accepté.
      ${order.proBusinessName} va maintenant la préparer.
    </p>
    ${
      order.deliveryCode
        ? infoBox(
            `🔑 Code de remise à donner à votre livreur pour valider la livraison :
             <strong style="font-size:20px;letter-spacing:2px;">${order.deliveryCode}</strong>`,
            "green"
          )
        : ""
    }
    ${button("Suivre ma commande", TRACKING_URL)}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} confirmée`, html);
}

/** Envoyé quand le Pro passe la commande en préparation. */
export async function sendOrderPreparingEmail(
  email: string,
  order: OrderEmailData,
  estimatedMinutes: number
): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">👨‍🍳 Votre commande est en préparation</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${order.proBusinessName}</strong> prépare votre commande <strong>${order.orderNumber}</strong>.
      Temps de préparation estimé : environ <strong>${estimatedMinutes} minutes</strong>.
    </p>
    ${button("Suivre ma commande", TRACKING_URL)}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} en préparation`, html);
}

/** Envoyé quand le livreur récupère la commande (PICKED_UP) et se met en route. */
export async function sendOrderOnTheWayEmail(email: string, order: OrderEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🛵 Votre livreur est en route !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre commande <strong>${order.orderNumber}</strong> a été récupérée chez ${order.proBusinessName} et arrive
      chez vous. Suivez le trajet en direct depuis l'app.
    </p>
    ${
      order.deliveryCode
        ? infoBox(
            `🔑 Rappel — code de remise à donner à votre livreur :
             <strong style="font-size:20px;letter-spacing:2px;">${order.deliveryCode}</strong>`,
            "green"
          )
        : ""
    }
    ${button("Suivre la livraison en direct", TRACKING_URL)}
  `);
  await sendEmail(email, `Votre commande ${order.orderNumber} arrive`, html);
}

/** Envoyé à la livraison — récapitulatif façon facture (pas de PDF pour l'instant, HTML uniquement). */
export async function sendOrderDeliveredEmail(email: string, order: OrderEmailData): Promise<void> {
  const itemsHtml = (order.items ?? [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;font-size:13px;color:#374151;">${item.quantity}× ${item.productName}</td>
          <td style="padding:6px 0;font-size:13px;color:#1A1A2E;text-align:right;">${formatEuros(item.totalPrice)}</td>
        </tr>`
    )
    .join("");

  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">📦 Commande livrée !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre commande <strong>${order.orderNumber}</strong> chez ${order.proBusinessName} vient d'être livrée.
      Bon appétit / bonne réception !
    </p>
    ${
      itemsHtml
        ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #E5E7EB;padding-top:8px;">
            ${itemsHtml}
            <tr><td style="padding-top:10px;font-size:14px;font-weight:700;color:#1A1A2E;">Total</td>
                <td style="padding-top:10px;font-size:14px;font-weight:700;color:#1A1A2E;text-align:right;">${formatEuros(order.total)}</td></tr>
          </table>`
        : ""
    }
    <p style="font-size:13px;color:#6B7280;margin-top:20px;">
      Votre avis compte : notez le produit, ${order.proBusinessName}, votre livreur, et Do You Geckoo en
      quelques secondes — et partagez l'app si vous avez aimé l'expérience.
    </p>
    ${button(
      "Laisser un avis",
      order.orderId ? `${PORTAL_URLS.client}?screen=review&orderId=${order.orderId}` : TRACKING_URL
    )}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} livrée — récapitulatif`, html);
}

/** Envoyé quand une commande est annulée (par le client, le Pro, ou automatiquement). */
export async function sendOrderCancelledEmail(
  email: string,
  order: OrderEmailData,
  cancelledBy: "client" | "pro" | "system"
): Promise<void> {
  const reasonText = {
    client: "Vous avez annulé cette commande.",
    pro: `${order.proBusinessName} a dû annuler cette commande.`,
    system: "Cette commande a été annulée automatiquement.",
  }[cancelledBy];

  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Commande annulée</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre commande <strong>${order.orderNumber}</strong> a été annulée. ${reasonText}
    </p>
    ${infoBox("Si un paiement avait été prélevé, il vous sera intégralement remboursé sous quelques jours.", "orange")}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} annulée`, html);
}

/** Envoyé quand un remboursement Stripe est effectué (webhook charge.refunded). */
export async function sendOrderRefundedEmail(email: string, order: OrderEmailData, amount: number): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">💶 Remboursement effectué</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Un remboursement de <strong>${formatEuros(amount)}</strong> pour votre commande
      <strong>${order.orderNumber}</strong> a été effectué. Il apparaîtra sur votre relevé bancaire sous
      5 à 10 jours ouvrés, selon votre banque.
    </p>
  `);
  await sendEmail(email, `Remboursement — commande ${order.orderNumber}`, html);
}

// ==================== PRO ====================

/** Envoyé au Pro dès qu'une nouvelle commande payée arrive. */
export async function sendNewOrderToProEmail(email: string, order: OrderEmailData, clientName: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🔔 Nouvelle commande !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Vous avez reçu une nouvelle commande <strong>${order.orderNumber}</strong> de la part de
      <strong>${clientName}</strong>, pour un montant de <strong>${formatEuros(order.total)}</strong>.
    </p>
    ${button("Voir la commande", `${PORTAL_URLS.pro}`)}
  `);
  await sendEmail(email, `Nouvelle commande ${order.orderNumber}`, html);
}

/** Envoyé au Pro quand un client annule une commande déjà transmise. */
export async function sendOrderCancelledByClientToProEmail(email: string, order: OrderEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Commande annulée par le client</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      La commande <strong>${order.orderNumber}</strong> vient d'être annulée par le client. Aucune action de votre
      part n'est nécessaire.
    </p>
  `);
  await sendEmail(email, `Commande ${order.orderNumber} annulée par le client`, html);
}
