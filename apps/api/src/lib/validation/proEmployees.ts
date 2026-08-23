import { z } from "zod";
import { UserStatus } from "@golfeexpress/types";

export const createProEmployeeSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  // Obligatoire (pas .optional()) : public."User".phone est NOT NULL UNIQUE
  // (voir prisma/schema.prisma) -- le trigger Postgres qui crée la ligne
  // User à partir de auth.users échoue sinon avec "Database error creating
  // new user" (erreur Supabase Auth générique, remontée en 409 par cette
  // route -- voir POST /api/pros/me/employees). Un employé a donc un numéro
  // requis, comme tout autre compte de la plateforme.
  phone: z
    .string()
    .min(8, "Numéro de téléphone invalide.")
    .regex(/^\+?[0-9 .-]+$/, "Numéro de téléphone invalide."),
});

export type CreateProEmployeeInput = z.infer<typeof createProEmployeeSchema>;

// Le patron ne peut faire basculer un employé qu'entre ces deux statuts
// (activer/désactiver) -- jamais BANNED (réservé à la modération admin) ni
// PENDING_VERIFICATION (n'a pas de sens pour un compte créé directement
// actif par le patron, voir POST /api/pros/me/employees).
const EMPLOYEE_TOGGLE_STATUSES = [UserStatus.ACTIVE, UserStatus.SUSPENDED] as const;

export const updateProEmployeeStatusSchema = z.object({
  status: z.enum(EMPLOYEE_TOGGLE_STATUSES),
});

export type UpdateProEmployeeStatusInput = z.infer<typeof updateProEmployeeStatusSchema>;
