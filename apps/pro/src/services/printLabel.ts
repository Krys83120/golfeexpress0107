import type { Order } from "@golfeexpress/types";

/**
 * Imprime une étiquette de commande.
 *
 * Approche volontairement simple et universelle : on injecte une page HTML
 * mise en forme aux dimensions d'une étiquette thermique classique (58mm de
 * large, hauteur automatique selon le contenu) dans une iframe invisible,
 * puis on déclenche print() sur cette iframe. Ça fonctionne avec N'IMPORTE
 * QUELLE imprimante déjà installée sur l'ordinateur/la tablette — y compris
 * une imprimante d'étiquettes USB/Bluetooth thermique, tant qu'elle
 * apparaît comme imprimante Windows/macOS classique (c'est le cas de la
 * quasi-totalité des modèles grand public : Zebra, Brother QL, Dymo, etc.)
 * — sans avoir besoin d'intégrer un SDK spécifique à une marque de matériel.
 *
 * Pourquoi une iframe et pas window.open() : les navigateurs bloquent
 * l'ouverture de nouvelles fenêtres qui ne sont pas déclenchées par un clic
 * direct de l'utilisateur. Ça casserait l'impression AUTOMATIQUE dès
 * qu'une commande arrive (voir useNewOrderNotifications). Une iframe
 * injectée dans la page actuelle n'est pas concernée par ce blocage.
 *
 * Pour une imprimante à ticket 80mm (plus courante en restauration que le
 * 58mm), changer LABEL_WIDTH_MM ci-dessous ou en faire un réglage dans
 * NotificationsPage si plusieurs formats doivent coexister.
 */
const LABEL_WIDTH_MM = 58;

export function printOrderLabel(order: Order) {
  const itemsHtml = (order.items ?? [])
    .map((item) => `<div class="item"><span class="qty">${item.quantity}x</span> ${escapeHtml(item.productName)}</div>`)
    .join("");

  const clientName = `${order.client?.user?.firstName ?? ""} ${order.client?.user?.lastName ?? ""}`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 3mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      width: ${LABEL_WIDTH_MM}mm;
      margin: 0;
      color: #000;
    }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
    .logo { font-size: 16px; font-weight: 800; }
    .order-number { font-size: 20px; font-weight: 800; margin-top: 4px; }
    .meta { font-size: 11px; margin-bottom: 8px; }
    .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 8px; }
    .item { font-size: 13px; padding: 2px 0; }
    .qty { font-weight: 700; }
    .note { font-size: 11px; font-style: italic; margin-bottom: 8px; }
    .footer { font-size: 10px; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🦎 Do You Geckoo</div>
    <div class="order-number">${escapeHtml(order.orderNumber)}</div>
  </div>
  <div class="meta">
    ${clientName ? `👤 ${escapeHtml(clientName)}<br/>` : ""}
    📍 ${escapeHtml(order.toAddress?.street ?? "")}, ${escapeHtml(order.toAddress?.city ?? "")}<br/>
    🕐 ${new Date(order.placedAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
  </div>
  <div class="items">${itemsHtml}</div>
  ${order.clientNote ? `<div class="note">📝 ${escapeHtml(order.clientNote)}</div>` : ""}
  <div class="footer">Total : ${Number(order.total).toFixed(2)} €</div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  // Laisse le temps au navigateur de mettre en page le contenu injecté
  // avant de déclencher l'impression.
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Nettoyage après un délai généreux — laisse le temps à la boîte de
    // dialogue d'impression système d'être traitée avant de retirer l'iframe.
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }, 250);
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
