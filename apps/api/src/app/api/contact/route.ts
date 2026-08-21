import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendContactMessageEmail, sendContactMessageConfirmation } from "@/lib/emails/contactEmails";

const CONTACT_TYPES = ["Aide", "Bug", "Erreur", "Demande directe"];
const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact (public, pas d'auth requise)
 *
 * Widget "Nous contacter" du site vitrine (voir apps/www ContactWidget.tsx)
 * -- pas de compte utilisateur requis, contrairement au système de
 * réclamations sur commande (OrderReport). Le message est enregistré
 * (model ContactMessage) pour être géré et archivé depuis l'admin (voir
 * apps/admin ContactMessagesPage.tsx et PATCH /api/admin/contact-messages/
 * [messageId]) -- la réponse part de là, pas de la messagerie personnelle
 * de l'équipe. On envoie quand même une alerte email immédiate à
 * contact@doyougeckoo.fr (simple heads-up qu'un message est arrivé) et un
 * accusé de réception au visiteur.
 */
async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { name, email, type, subject, message } = body as {
    name?: string;
    email?: string;
    type?: string;
    subject?: string;
    message?: string;
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
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  const contactMessage = await prisma.contactMessage.create({
    data: {
      name: trimmedName,
      email: trimmedEmail,
      type: resolvedType,
      subject: trimmedSubject,
      message: trimmedMessage,
    },
  });

  await sendContactMessageEmail({
    name: trimmedName,
    email: trimmedEmail,
    type: resolvedType,
    subject: trimmedSubject,
    message: trimmedMessage,
  });

  await sendContactMessageConfirmation(trimmedEmail, trimmedName);

  return NextResponse.json({ ok: true, id: contactMessage.id }, { status: 201 });
}

export const POST = withErrorHandling(postHandler);
