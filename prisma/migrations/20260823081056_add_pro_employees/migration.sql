-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PRO_EMPLOYEE';

-- CreateTable
CREATE TABLE "ProEmployee" (
    "id" TEXT NOT NULL,
    "pro_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProEmployee_user_id_key" ON "ProEmployee"("user_id");

-- AddForeignKey
ALTER TABLE "ProEmployee" ADD CONSTRAINT "ProEmployee_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProEmployee" ADD CONSTRAINT "ProEmployee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
