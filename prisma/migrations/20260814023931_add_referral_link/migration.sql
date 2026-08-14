-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "referred_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
