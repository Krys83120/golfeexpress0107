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
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Voir fonts.ts : on évite la police standard "Helvetica" intégrée à
    // pdfkit (chargée dynamiquement depuis un .afm sur disque), qui casse
    // sur Vercel car le fichier n'est pas inclus dans la fonction déployée.
    doc.registerFont("Body", loadBodyFont());
    doc.font("Body");

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
