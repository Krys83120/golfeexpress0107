-- AlterTable
ALTER TABLE "OptionChoice" ADD COLUMN     "is_available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unavailable_until" TIMESTAMP(3);
