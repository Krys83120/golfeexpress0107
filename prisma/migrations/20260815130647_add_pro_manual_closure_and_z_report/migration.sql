-- CreateEnum
CREATE TYPE "ManualClosureReason" AS ENUM ('VACATION', 'CLOSED');

-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "is_manually_closed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manual_closure_note" TEXT,
ADD COLUMN     "manual_closure_reason" "ManualClosureReason",
ADD COLUMN     "manual_closure_until" TIMESTAMP(3);
