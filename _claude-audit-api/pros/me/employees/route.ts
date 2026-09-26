import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createProEmployeeSchema } from "@/lib/validation/proEmployees";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EMPLOYEE_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  createdAt: true,
} as const;

/**
 * GET /api/pros/me/employees
 *
 * Liste des comptes employés créés par le Pro connecté (patron uniquement --
 * requireAuth ci-dessous exclut PRO_EMPLOYEE, un employé ne peut jamais
 * lister ni gérer d'autres employés). Utilisé par la page de gestion des
 * employés côté apps/pro.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const employees = await prisma.proEmployee.findMany({
    where: { proId: pro.id },
    include: { user: { select: EMPLOYEE_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ employees });
}

/**
 * POST /api/pros/me/employees
 * Body: { email, password, firstName, lastName, phone? }
 *
 * Crée un compte employé (role PRO_EMPLOYEE) au nom du Pro connecté, via
 * supabaseAdmin.auth.admin.createUser (voir lib/supabaseAdmin.ts) -- PAS le
 * signUp() classique de /api/auth/signup : c'est ici le patron qui choisit
 * l'email/mot de passe initial de son employé, pas l'employé lui-même. Le
 * compte est créé immédiatement confirmé (email_confirm: true) : le patron
 * vouche pour l'identité de son employé, pas besoin du flow de confirmation
 * email public.
 *
 * L'accès de ce compte reste volontairement restreint : côté client (voir
 * apps/pro/src/App.tsx et Sidebar.tsx, qui masquent Finances/Paramètres/
 * Abonnement/Avis/Dashboard dès que isEmployee est vrai) ET côté serveur
 * (voir requireProOrEmployee() dans middleware/auth.ts, à utiliser pour
 * toute route Pro qui doit rester accessible aux employés -- la
 * restriction visuelle seule ne suffit jamais). Un employé ne peut par
 * ailleurs jamais atteindre cette route lui-même : requireAuth() ci-dessus
 * exige explicitement le rôle PRO.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = createProEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const { email, password, firstName, lastName, phone } = parsed.data;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName, lastName, phone: phone ?? "", role: "PRO_EMPLOYEE" },
  });

  if (error || !data.user) {
    // Cas fréquent : email déjà utilisé par un autre compte (Client, Pro,
    // Livreur ou employé).
    throw new ApiError(409, error?.message ?? "La création du compte employé a échoué.");
  }

  // Comme pour /api/auth/signup : le trigger Postgres `on_auth_user_created`
  // a déjà créé la ligne public."User" (role PRO_EMPLOYEE) au moment où
  // createUser() répond ci-dessus. On lie maintenant ce compte à la
  // boutique. Si cette étape échoue, on supprime le compte Auth qu'on vient
  // de créer pour éviter un compte orphelin (User sans ProEmployee) qui
  // bloquerait définitivement cet email pour toute nouvelle tentative.
  let employee;
  try {
    employee = await prisma.proEmployee.create({
      data: { proId: pro.id, userId: data.user.id },
      include: { user: { select: EMPLOYEE_USER_SELECT } },
    });
  } catch (err) {
    console.error("[pros/me/employees POST] Échec liaison ProEmployee, rollback du compte Auth:", err);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw new ApiError(500, "La création du compte employé a échoué. Merci de réessayer.");
  }

  return NextResponse.json({ employee }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
