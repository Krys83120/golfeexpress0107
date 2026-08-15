import PDFDocument from "pdfkit";
import { formatEuros } from "./shared";
import { loadBodyFont } from "./fonts";
import type { ZReportData } from "@/lib/zReport";

/**
 * Génère le rapport Z (clôture caisse) en PDF — utilisé comme justificatif
 * comptable téléchargeable ou envoyable par email (voir
 * /api/pros/me/z-report(+/send)). Même choix technique que le ticket de
 * commande : pdfkit, pur Node, pas de binaire chromium.
 */
export async function buildZReportPdf(data: ZReportData): Promise<Buffer> {
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
    console.error(`[PDF][zReport] bodyFont chargée : ${bodyFont?.length ?? "undefined"} octets`);
    if (!bodyFont || bodyFont.length < 1000) {
      throw new Error(`[PDF][zReport] Police introuvable ou corrompue (taille=${bodyFont?.length}).`);
    }
    const doc = new PDFDocument({ size: "A4", margin: 50, font: bodyFont as unknown as string });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const right = 545;

    doc.fontSize(20).fillColor("#1A1A2E").text("Do You Geckoo");
    doc.fontSize(10).fillColor("#6B7280").text("Sainte-Maxime — Golfe de Saint-Tropez");
    doc.moveDown(1.2);

    doc.fontSize(14).fillColor("#1A1A2E").text("Rapport Z — clôture de caisse");
    doc.fontSize(11).fillColor("#374151").text(data.range.label);
    doc.moveDown(0.6);

    doc.fontSize(11).fillColor("#1A1A2E").text(`Commerçant : ${data.proBusinessName}`);
    if (data.proSiret) doc.fontSize(9).fillColor("#6B7280").text(`SIRET : ${data.proSiret}`);
    doc.moveDown(1);

    // Bloc de synthèse
    doc.roundedRect(50, doc.y, right - 50, 92, 6).fillAndStroke("#F3F4F6", "#E5E7EB");
    const summaryTop = doc.y + 14;
    doc.fillColor("#1A1A2E").fontSize(10);
    doc.text(`Commandes facturées : ${data.orderCount}`, 65, summaryTop);
    doc.text(`Chiffre d'affaires encaissé : ${formatEuros(data.grossAmount)}`, 65, summaryTop + 18);
    doc.text(`Commission plateforme : -${formatEuros(data.commissionAmount)}`, 65, summaryTop + 36);
    doc.fontSize(12).text(`Net perçu : ${formatEuros(data.netAmount)}`, 65, summaryTop + 58);
    doc.y = summaryTop + 92;
    doc.moveDown(1);

    if (data.refundedCount > 0 || data.cancelledCount > 0) {
      doc.fontSize(9).fillColor("#6B7280").text(
        `Pour information (hors total ci-dessus) : ${data.refundedCount} commande(s) remboursée(s) ` +
          `(${formatEuros(data.refundedAmount)}), ${data.cancelledCount} commande(s) annulée(s).`,
        50,
        doc.y,
        { width: right - 50 }
      );
      doc.moveDown(1);
    }

    if (data.dailyBreakdown.length > 0) {
      doc.fontSize(11).fillColor("#1A1A2E").text("Détail par jour");
      doc.moveDown(0.3);

      let y = doc.y;
      doc.fontSize(9).fillColor("#6B7280");
      doc.text("Date", 50, y, { width: 200 });
      doc.text("Commandes", 250, y, { width: 120, align: "right" });
      doc.text("CA encaissé", 370, y, { width: right - 370, align: "right" });
      y = doc.y + 4;
      doc.moveTo(50, y).lineTo(right, y).strokeColor("#E5E7EB").stroke();
      doc.y = y + 8;

      for (const day of data.dailyBreakdown) {
        const rowY = doc.y;
        doc.fontSize(9).fillColor("#374151");
        doc.text(day.dateLabel, 50, rowY, { width: 200 });
        doc.text(String(day.orderCount), 250, rowY, { width: 120, align: "right" });
        doc.text(formatEuros(day.grossAmount), 370, rowY, { width: right - 370, align: "right" });
        doc.y = rowY + 16;
      }
    } else {
      doc.fontSize(10).fillColor("#6B7280").text("Aucune commande facturée sur cette période.");
    }

    doc.moveDown(1.5);
    doc.fontSize(8).fillColor("#9CA3AF").text(
      "Document généré automatiquement par Do You Geckoo à des fins de traçabilité comptable — " +
        "conservez-le pour vos archives. Il ne remplace pas votre comptabilité officielle.",
      50,
      doc.y,
      { width: right - 50 }
    );

    doc.end();
  });
}
