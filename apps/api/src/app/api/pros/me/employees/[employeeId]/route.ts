import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateProEmployeeStatusSchema } from "@/lib/validation/proEmployees";
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
 * Charge l'employé ciblé et vérifie qu'il appartient bien au Pro connecté --
 * factorisé ici car PATCH et DELETE ci-dessous font exactement la même
 * vérification avant d'agir.
 */
async function loadOwnedEmployee(proId: string, employeeId: string) {
  const employee = await prisma.proEmployee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.proId !== proId) {
    throw new ApiError(404, "Compte employé introuvable.");
  }
  return employee;
}

/**
 * PATCH /api/pros/me/employees/[employeeId]
 * Body: { status: "ACTIVE" | "SUSPENDED" }
 *
 * Active ou désactive (sans supprimer) le compte d'un employé -- réutilise
 * public."User".status, déjà relu à chaque requête par requireAuth() dans
 * middleware/auth.ts : un employé SUSPENDED se voit immédiatement refuser
 * l'accès (403), sans avoir à toucher au mot de passe ni au compte Auth
 * Supabase. Réversible à tout moment en repassant status à ACTIVE --
 * utiliser DELETE ci-dessous pour une révocation définitive.
 */
async function patchHandler(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const employee = await loadOwnedEmployee(pro.id, params.employeeId);

  const body = await req.json().catch(() => null);
  const parsed = updateProEmployeeStatusSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const user = await prisma.user.update({
    where: { id: employee.userId },
    data: { status: parsed.data.status },
    select: EMPLOYEE_USER_SELECT,
  });

  return NextResponse.json({ employee: { ...employee, user } });
}

/**
 * DELETE /api/pros/me/employees/[employeeId]
 *
 * Révoque définitivement l'accès d'un employé : supprime le compte Auth
 * Supabase (toute session existante devient invalide immédiatement) ET la
 * ligne ProEmployee. Contrairement au PATCH ci-dessus (réversible), cette
 * action est définitive -- à réserver au départ d'un employé, pas à une
 * simple mise en pause (PATCH status=SUSPENDED convient mieux pour ça).
 *
 * NOTE (limite connue) : la ligne public."User" de l'employé n'est pas
 * supprimée (même logique que DELETE /api/auth/me -- éviter de casser un
 * historique éventuel plutôt qu'un vrai risque ici, les employés n'étant
 * rattachés à aucune commande). Recréer un compte employé avec le même
 * email après suppression peut donc échouer si l'email reste occupé côté
 * public."User" ; à traiter séparément si ce cas se présente en pratique.
 */
async function deleteHandler(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const employee = await loadOwnedEmployee(pro.id, params.employeeId);

  await supabaseAdmin.auth.admin.deleteUser(employee.userId).catch((err) => {
    console.error("[pros/me/employees DELETE] Échec suppression du compte Auth (on continue quand même) :", err);
  });

  // Supprimé même si la suppression Auth ci-dessus échoue -- on ne veut
  // jamais laisser un lien ProEmployee actif vers un compte qu'on a essayé
  // de révoquer, quitte à devoir nettoyer un compte Auth orphelin séparément.
  await prisma.proEmployee.delete({ where: { id: employee.id } });

  return NextResponse.json({ deleted: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
