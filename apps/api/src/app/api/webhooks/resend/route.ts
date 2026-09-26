import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/webhooks/resend
 *
 * Reçoit les événements Resend (ouverture/clic d'un mail) pour alimenter le
 * suivi de la page Admin > Prospection (ajout du 26/09/2026, demande de
 * Krys : "je veux savoir si je l'ai déjà envoyé, s'il l'ont lu, et s'ils ont
 * cliqué pour visiter le site"). On ne traite ici QUE les events liés à un
 * Prospect (retrouvé via data.email_id == Prospect.prospectingEmailId) --
 * les autres emails transactionnels (commandes, validations...) ne sont pas
 * concernés et sont silencieusement ignorés.
 *
 * SÉCURITÉ : Resend signe ses webhooks au format Svix (voir
 * https://resend.com/docs/dashboard/webhooks/verify-webhooks-signatures) --
 * même raisonnement que webhooks/stripe/route.ts : on vérifie la signature
 * avant de faire confiance au contenu, avec le corps BRUT de la requête
 * (`req.text()`, jamais `req.json()` directement). Pas de dépendance au
 * paquet `svix` : le calcul est un simple HMAC-SHA256, fait à la main pour
 * ne pas alourdir les dépendances de l'API pour un seul usage.
 *
 * Configuration requise côté Resend Dashboard > Webhooks :
 *   URL: https://<votre-domaine-api>/api/webhooks/resend
 *   Events à écouter: email.opened, email.clicked
 *   Copier le "Signing Secret" affiché dans RESEND_WEBHOOK_SECRET (Vercel)
 *
 * IMPORTANT (à faire une seule fois, manuellement, côté Resend) : le
 * tracking d'ouverture/clic n'est PAS activé par défaut sur un domaine
 * Resend -- voir Resend Dashboard > Domains > doyougeckoo.fr > Tracking,
 * activer "Open Tracking" et "Click Tracking". Sans ça, Resend n'enverra
 * jamais ces deux events, même avec le webhook correctement configuré.
 */
function isValidSignature(rawBody: string, svixId: string, svixTimestamp: string, svixSignature: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  // svix-signature peut contenir plusieurs signatures espacées (rotation de
  // clé), chacune au format "v1,<base64>" -- une correspondance suffit.
  return svixSignature
    .split(" ")
    .map((part) => part.split(",")[1])
    .some((sig) => sig === expected);
}

export async function POST(req: NextRequest) {
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  const rawBody = await req.text();

  if (!isValidSignature(rawBody, svixId, svixTimestamp, svixSignature)) {
    console.error("[webhooks/resend] Signature invalide — event ignoré.");
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId || (event.type !== "email.opened" && event.type !== "email.clicked")) {
    // Pas un event qui nous concerne (email.delivered, email.bounced, un
    // mail transactionnel qui n'est pas une prospection...) -- on répond
    // 200 quand même : Resend réessaierait sinon inutilement.
    return NextResponse.json({ ignored: true });
  }

  const prospect = await prisma.prospect.findFirst({ where: { prospectingEmailId: emailId } });
  if (!prospect) {
    return NextResponse.json({ ignored: true });
  }

  // On ne garde que la PREMIÈRE ouverture/le PREMIER clic -- Resend peut
  // envoyer l'event plusieurs fois (relecture du mail, plusieurs clics sur
  // le bouton) sans que ça change quoi que ce soit pour Krys.
  if (event.type === "email.opened" && !prospect.prospectingEmailOpenedAt) {
    await prisma.prospect.update({ where: { id: prospect.id }, data: { prospectingEmailOpenedAt: new Date() } });
  } else if (event.type === "email.clicked" && !prospect.prospectingEmailClickedAt) {
    await prisma.prospect.update({ where: { id: prospect.id }, data: { prospectingEmailClickedAt: new Date() } });
  }

  return NextResponse.json({ received: true });
}
