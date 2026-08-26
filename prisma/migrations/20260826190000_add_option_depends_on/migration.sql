-- AlterTable
ALTER TABLE "ProductOption" ADD COLUMN     "depends_on_choice_id" TEXT;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_depends_on_choice_id_fkey" FOREIGN KEY ("depends_on_choice_id") REFERENCES "OptionChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
