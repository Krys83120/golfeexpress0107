import { z } from "zod";

export const RIDER_PROFESSIONAL_STATUSES = ["AUTO_ENTREPRENEUR", "SALARIE", "INDEPENDANT", "AUTRE"] as const;

export const updateRiderProfileSchema = z.object({
  vehicleType: z.enum(["SCOOTER", "VOITURE", "VELO", "ELECTRIQUE"]).optional(),
  vehiclePlate: z.string().nullable().optional(),
  licenseNumber: z.string().nullable().optional(),
  idCardFront: z.string().optional(),
  idCardBack: z.string().optional(),
  iban: z.string().optional(),

  birthDate: z.string().nullable().optional(), // ISO date, ex: "1995-04-12"
  street: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  verificationSelfieUrl: z.string().nullable().optional(),
  professionalStatus: z.enum(RIDER_PROFESSIONAL_STATUSES).nullable().optional(),
  siret: z.string().nullable().optional(),
  insuranceProvider: z.string().nullable().optional(),
  insurancePolicyNumber: z.string().nullable().optional(),

  /** true = le livreur vient d'accepter les CGU/CGV dans ce même appel. */
  acceptTerms: z.boolean().optional(),
  termsVersion: z.string().optional(),
});

export type UpdateRiderProfileInput = z.infer<typeof updateRiderProfileSchema>;
