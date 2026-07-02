import { z } from "zod";
import { UserRole } from "@golfeexpress/types";

// Rôles que l'on autorise à l'auto-inscription publique. ADMIN/SUPER_ADMIN
// ne peuvent pas être créés via /api/auth/signup — ils sont créés via un
// endpoint admin dédié, protégé par requireAuth([SUPER_ADMIN]).
const SELF_SIGNUP_ROLES: UserRole[] = [UserRole.CLIENT, UserRole.PRO, UserRole.RIDER];

export const signupSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  firstName: z.string().min(1, "Le prénom est requis."),
  lastName: z.string().min(1, "Le nom est requis."),
  phone: z
    .string()
    .min(8, "Numéro de téléphone invalide.")
    .regex(/^\+?[0-9 .-]+$/, "Numéro de téléphone invalide."),
  role: z
    .nativeEnum(UserRole)
    .refine((r) => SELF_SIGNUP_ROLES.includes(r), { message: "Rôle non autorisé à l'auto-inscription." })
    .default(UserRole.CLIENT),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken requis."),
});
