-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "subscription_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subscription_current_period_start" TIMESTAMP(3);
