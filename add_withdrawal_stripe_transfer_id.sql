-- Correctif retraits livreur (23/09/2026) : trace le vrai virement Stripe
-- Connect associé à un retrait, une fois traité (voir
-- riders/me/withdrawals/route.ts et prisma/schema.prisma, model Withdrawal).
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "stripe_transfer_id" TEXT;
