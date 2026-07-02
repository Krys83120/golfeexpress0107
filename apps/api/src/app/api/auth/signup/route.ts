import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signupSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, withErrorHandling } from "@/middleware/auth";

/**
 * POST /api/auth/signup
 *
 * Crée un compte via Supabase Auth (signUp). Le trigger SQL
 * `on_auth_user_created` (voir supabase/migrations) crée automatiquement la
 * ligne correspondante dans public."User". On complète ensuite le profil
 * métier (Client/Pro/Rider) selon le rôle demandé.
 *
 * Body: { email, password, firstName, lastName, phone, role? }
 * Réponse 201: { user, session } — session peut être null si la confirmation
 * email est activée côté Supabase (auth.users.email_confirmed_at IS NULL).
 */
async function handler(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { email, password, firstName, lastName, phone, role } = parsed.data;

  // Client Supabase anonyme dédié à cet appel (pas supabaseAdmin : on veut
  // le comportement normal de signUp, avec session retournée).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName, phone, role },
    },
  });

  if (error) {
    // Cas fréquent : email déjà utilisé
    throw new ApiError(409, error.message);
  }

  if (!data.user) {
    throw new ApiError(500, "La création du compte a échoué de manière inattendue.");
  }

  // Le trigger Postgres tourne de façon asynchrone par rapport à cette
  // requête HTTP (il est déclenché par l'INSERT dans auth.users, dans la
  // même transaction côté Supabase) — au moment où signUp() nous répond,
  // la ligne public."User" existe déjà. On crée maintenant le profil
  // métier associé au rôle choisi.
  //
  // Si cette étape échoue, on supprime le compte Auth créé juste avant pour
  // éviter un compte "orphelin" (User sans Client/Pro/Rider) que la personne
  // ne pourrait plus recréer (email déjà pris).
  try {
    if (role === "PRO") {
      await prisma.pro.create({
        data: {
          userId: data.user.id,
          businessName: `${firstName} ${lastName}`, // valeur de départ, modifiable ensuite
          siret: `PENDING-${data.user.id.slice(0, 8)}`, // à compléter via PATCH /api/pros/me
          category: "AUTRE",
          phone,
          emailContact: email,
        },
      });
    } else if (role === "RIDER") {
      await prisma.rider.create({
        data: {
          userId: data.user.id,
          vehicleType: "SCOOTER", // valeur de départ, à compléter via PATCH /api/riders/me
          idCardFront: "",
          idCardBack: "",
          iban: "",
        },
      });
    } else {
      await prisma.client.create({
        data: { userId: data.user.id },
      });
    }
  } catch (profileError) {
    console.error("[signup] Échec création profil métier, rollback du compte Auth:", profileError);
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw new ApiError(500, "La création du compte a échoué. Merci de réessayer.");
  }

  return NextResponse.json(
    {
      user: { id: data.user.id, email: data.user.email, role },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
          }
        : null,
      requiresEmailConfirmation: !data.session,
    },
    { status: 201 }
  );
}

export const POST = withErrorHandling(handler);
