-- CreateEnum
CREATE TYPE "OrderReportCategory" AS ENUM ('MISSING_ITEMS', 'WRONG_ITEMS', 'DAMAGED_OR_QUALITY', 'LATE_DELIVERY', 'DELIVERY_NOT_RECEIVED', 'RIDER_BEHAVIOR', 'CLIENT_UNREACHABLE', 'ADDRESS_ISSUE', 'PAYMENT_ISSUE', 'STOCK_UNAVAILABLE', 'TECHNICAL_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "pro_rating" DROP NOT NULL;

-- CreateTable
CREATE TABLE "order_reports" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reporter_role" "UserRole" NOT NULL,
    "category" "OrderReportCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "photo_url" TEXT,
    "status" "OrderReportStatus" NOT NULL DEFAULT 'OPEN',
    "admin_reply" TEXT,
    "replied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_reports" ADD CONSTRAINT "order_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reports" ADD CONSTRAINT "order_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
