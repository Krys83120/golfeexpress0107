-- AlterTable
ALTER TABLE "ProductOption" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OptionChoice" ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;
