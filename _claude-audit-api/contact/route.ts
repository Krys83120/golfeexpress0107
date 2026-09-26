import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendContactMessageEmail, sendContactMessageConfirmation } from "@/lib/emails/contactEmails";
import { enforceRateLimit } from "@/lib/rateLimit";

// "Modification à faire" et "Autre" ajoutés le 23/09/2026 pour les bulles
// des apps Client/Pro/Livreur (voir leurs ContactWidget.tsx respectifs) --
// "Aide"/"Erreur"/"Demande directe" restent utilisés par le widget du site
// vitrine (apps/www), inchangé. Liste volontairement partagée (superset)
// entre tous les widgets plutôt qu'une par app, pour que la validation
// ci-dessous ne retombe jamais silencieusement sur "Aide" par défaut.
const CONTACT_TYPES = ["Aide", "Bug", "Modification à faire", "Erreur", "Demande directe", "Autre"];
// Application d'origine du message -- voir le commentaire sur `source` dans
// prisma/schema.prisma (model ContactMessage).
const CONTACT_SOURCES = ["www", "client", "pro", "livreur"];
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact (public, pas d'auth requise)
 *
 * Widget "Nous contacter" du site vitrine (voir apps/www ContactWidget.tsx)
 * -- pas de compte utilisateur requis, contrairement au système de
 * réclamations sur commande (OrderReport). Depuis le 23/09/2026, également
 * utilisé par les bulles "Nous contacter" des apps Client/Pro/Livreur (voir
 * leurs ContactWidget.tsx respectifs, qui envoient `source` en plus) --
 * ces apps envoient un token d'auth si connecté, mais cette route reste
 * volontairement publique/sans vérification d'auth pour ne pas dupliquer
 * la logique entre les 4 widgets. Le message est enregistré (model
 * ContactMessage) pour être géré et archivé depuis l'admin (voir
 * apps/admin ContactMessagesPage.tsx et PATCH /api/admin/contact-messages/
 * [messageId]) -- la réponse part de là, pas de la messagerie personnelle
 * de l'équipe. On envoie quand même une alerte email immédiate à
 * contact@doyougeckoo.fr (simple heads-up qu'un message est arrivé) et un
 * accusé de réception au visiteur.
 */
async function postHandler(req: NextRequest) {
  // Rate limiting (23/09/2026, audit sécurité) : 5 messages / heure / IP --
  // ce endpoint est public (pas d'auth), donc le plus exposé au spam pur.
  await enforceRateLimit(req, { route: "contact", limit: 5, windowMs: 60 * 60 * 1000 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { name, email, type, subject, message, source } = body as {
    name?: string;
    email?: string;
    type?: string;
    subject?: string;
    message?: string;
    source?: string;
  };

  if (!name || !name.trim()) {
    throw new ApiError(400, "Merci d'indiquer votre nom.");
  }
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    throw new ApiError(400, "Merci d'indiquer une adresse email valide.");
  }
  if (!subject || !subject.trim()) {
    throw new ApiError(400, "Merci d'indiquer un sujet.");
  }
  if (!message || !message.trim()) {
    throw new ApiError(400, "Merci de décrire votre demande.");
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`);
  }
  const resolvedType = type && CONTACT_TYPES.includes(type) ? type : "Aide";
  const resolvedSource = source && CONTACT_SOURCES.includes(source) ? source : "www";
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  const contactMessage = await prisma.contactMessage.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      type: resolvedType,
      source: resolvedSource,
      subject: trimmedSubject,
      message: trimmedMessage,
    },
  });

  await sendContactMessageEmail({
    name: trimmedName,
    email: trimmedEmail,
    type: resolvedType,
    source: resolvedSource,
    subject: trimmedSubject,
    message: trimmedMessage,
  });

  await sendContactMessageConfirmation(trimmedEmail, trimmedName);

  return NextResponse.json({ ok: true, id: contactMessage.id }, { status: 201 });
}

export const POST = withErrorHandling(postHandler);
