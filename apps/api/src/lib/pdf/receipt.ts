import PDFDocument from "pdfkit";
import { formatEuros, formatDateTimeFr, translatePaymentStatus } from "./shared";
import { loadBodyFont } from "./fonts";

export interface ReceiptItemData {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptData {
  orderNumber: string;
  placedAt: Date;
  deliveredAt?: Date | null;
  proBusinessName: string;
  proSiret?: string | null;
  proAddress?: string | null;
  clientName: string;
  items: ReceiptItemData[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  paymentStatus: string;
}

/**
 * Génère le ticket de commande en PDF (justificatif d'achat téléchargeable
 * ou envoyable par email — voir /api/orders/[orderId]/receipt(+/send)).
 * pdfkit est utilisé plutôt qu'un rendu HTML->PDF (puppeteer...) : pur
 * Node, sans binaire chromium à gérer sur les fonctions serverless Vercel.
 */
export async function buildReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // La police doit être fournie dès la construction de PDFDocument : son
    // constructeur appelle initFonts() en interne, qui charge IMMÉDIATEMENT
    // "Helvetica" par défaut (avant même qu'on puisse appeler .font() nous-
    // mêmes) — voir fonts.ts pour le pourquoi (ENOENT sur Vercel). Un appel
    // ultérieur à doc.registerFont()/doc.font() est donc trop tard : le
    // crash a déjà eu lieu dans le constructeur.
    //
    // Le cast ci-dessous est nécessaire : le typage communautaire
    // @types/pdfkit déclare `font` comme `string` uniquement sur les
    // options du constructeur, alors que pdfkit accepte bien un Buffer au
    // runtime (voir le type PDFFontSource utilisé par .font()/.registerFont()
    // dans ce même package de types — décalage/oubli des types, pas un vrai
    // problème d'exécution). Sans ce cast, `next build` échoue sur une
    // erreur TypeScript et Vercel garde silencieusement l'ancien déploiement
    // en ligne — ce qui explique que l'erreur précédente n'ait jamais changé.
    //
    // Garde-fou temporaire (à retirer une fois le bug de production
    // confirmé résolu) : si jamais ce déploiement tourne encore avec une
    // ancienne version de ce fichier (cache de build, etc.), on préfère un
    // message d'erreur explicite et immédiatement reconnaissable dans les
    // logs plutôt que de laisser pdfkit replonger silencieusement sur sa
    // police par défaut (Helvetica) et l'ENOENT habituel.
    const bodyFont = loadBodyFont();
    console.error(`[PDF][receipt] bodyFont chargée : ${bodyFont?.length ?? "undefined"} octets`);
    if (!bodyFont || bodyFont.length < 1000) {
      throw new Error(`[PDF][receipt] Police introuvable ou corrompue (taille=${bodyFont?.length}).`);
    }
    const doc = new PDFDocument({ size: "A4", margin: 50, font: bodyFont as unknown as string });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).fillColor("#1A1A2E").text("Do You Geckoo");
    doc.fontSize(10).fillColor("#6B7280").text("Sainte-Maxime — Golfe de Saint-Tropez");
    doc.moveDown(1.2);

    doc.fontSize(14).fillColor("#1A1A2E").text(`Ticket de commande ${data.orderNumber}`);
    doc.fontSize(9).fillColor("#6B7280").text(`Commandé le ${formatDateTimeFr(data.placedAt)}`);
    if (data.deliveredAt) {
      doc.text(`Livré le ${formatDateTimeFr(data.deliveredAt)}`);
    }
    doc.moveDown(0.8);

    doc.fontSize(11).fillColor("#1A1A2E").text(`Commerçant : ${data.proBusinessName}`);
    if (data.proSiret) doc.fontSize(9).fillColor("#6B7280").text(`SIRET : ${data.proSiret}`);
    if (data.proAddress) doc.fontSize(9).fillColor("#6B7280").text(data.proAddress);
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#1A1A2E").text(`Client : ${data.clientName}`);
    doc.moveDown(1);

    const colX = { item: 50, qty: 320, unit: 370, total: 450 };
    const tableRight = 545;

    doc.fontSize(10).fillColor("#1A1A2E");
    let y = doc.y;
    doc.text("Article", colX.item, y, { width: colX.qty - colX.item - 10 });
    doc.text("Qté", colX.qty, y, { width: colX.unit - colX.qty - 5, align: "right" });
    doc.text("P.U.", colX.unit, y, { width: colX.total - colX.unit - 5, align: "right" });
    doc.text("Total", colX.total, y, { width: tableRight - colX.total, align: "right" });
    y = doc.y + 4;
    doc.moveTo(50, y).lineTo(tableRight, y).strokeColor("#E5E7EB").stroke();
    doc.y = y + 8;

    for (const item of data.items) {
      const rowY = doc.y;
      doc.fontSize(9).fillColor("#374151");
      doc.text(item.productName, colX.item, rowY, { width: colX.qty - colX.item - 10 });
      doc.text(String(item.quantity), colX.qty, rowY, { width: colX.unit - colX.qty - 5, align: "right" });
      doc.text(formatEuros(item.unitPrice), colX.unit, rowY, { width: colX.total - colX.unit - 5, align: "right" });
      doc.text(formatEuros(item.totalPrice), colX.total, rowY, { width: tableRight - colX.total, align: "right" });
      doc.y = rowY + 18;
    }

    doc.moveTo(50, doc.y).lineTo(tableRight, doc.y).strokeColor("#E5E7EB").stroke();
    doc.moveDown(0.6);

    addSummaryLine(doc, "Sous-total", data.subtotal, tableRight);
    addSummaryLine(doc, "Frais de livraison", data.deliveryFee, tableRight);
    addSummaryLine(doc, "Frais de service", data.serviceFee, tableRight);
    if (data.discount > 0) addSummaryLine(doc, "Remise", -data.discount, tableRight);
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#1A1A2E").text(`Total payé : ${formatEuros(data.total)}`, 50, doc.y, {
      width: tableRight - 50,
      align: "right",
    });

    doc.moveDown(1.5);
    doc.fontSize(8).fillColor("#9CA3AF").text(
      `Statut du paiement : ${translatePaymentStatus(data.paymentStatus)}. Document généré automatiquement par ` +
        `Do You Geckoo à des fins de justificatif d'achat — conservez-le pour vos archives.`,
      50,
      doc.y,
      { width: tableRight - 50 }
    );

    doc.end();
  });
}

function addSummaryLine(doc: PDFKit.PDFDocument, label: string, amount: number, tableRight: number) {
  const y = doc.y;
  doc.fontSize(10).fillColor("#374151");
  doc.text(label, 50, y, { width: 300 });
  doc.text(formatEuros(amount), 50, y, { width: tableRight - 50, align: "right" });
  doc.y = y + 15;
}
