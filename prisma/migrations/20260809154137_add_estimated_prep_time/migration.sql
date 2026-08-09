-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "estimated_prep_minutes" INTEGER,
ADD COLUMN     "preparing_started_at" TIMESTAMP(3);
