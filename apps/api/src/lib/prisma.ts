import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma — évite d'épuiser les connexions à la base en dev
 * (Next.js recharge les modules à chaud) et garde une seule instance par
 * lambda en prod/serverless (Vercel).
 */

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient = globalThis.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
