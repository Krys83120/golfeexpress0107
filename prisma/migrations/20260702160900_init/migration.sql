-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'PRO', 'RIDER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ProCategory" AS ENUM ('RESTAURANT', 'BOULANGERIE', 'BOUCHERIE', 'EPICERIE', 'PHARMACIE', 'FLEURISTE', 'LIBRAIRIE', 'PARFUMERIE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ProStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('FREE', 'PREMIUM', 'PREMIUM_PLUS');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SCOOTER', 'VOITURE', 'VELO', 'ELECTRIQUE');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EarningType" AS ENUM ('DELIVERY_FEE', 'TIP', 'BONUS', 'INCENTIVE');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_STATUS', 'NEW_ORDER', 'RIDER_NEARBY', 'PROMO', 'SYSTEM', 'PAYMENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fidelity_points" INTEGER NOT NULL DEFAULT 0,
    "referral_code" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pro" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProCategory" NOT NULL,
    "logo" TEXT,
    "cover_image" TEXT,
    "phone" TEXT NOT NULL,
    "email_contact" TEXT NOT NULL,
    "status" "ProStatus" NOT NULL DEFAULT 'PENDING',
    "commission_rate" DECIMAL(65,30) NOT NULL DEFAULT 0.15,
    "subscription_type" "SubscriptionType" NOT NULL DEFAULT 'FREE',
    "subscription_expiry" TIMESTAMP(3),
    "rating" DECIMAL(2,1),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "pickup_address_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rider" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "vehicle_plate" TEXT,
    "license_number" TEXT,
    "id_card_front" TEXT NOT NULL,
    "id_card_back" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "status" "RiderStatus" NOT NULL DEFAULT 'PENDING',
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "current_lat" DECIMAL(10,8),
    "current_lng" DECIMAL(11,8),
    "current_location_updated_at" TIMESTAMP(3),
    "rating" DECIMAL(2,1),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "pro_id" TEXT,
    "label" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "complement" TEXT,
    "zip_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL,
    "pro_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geo_json" JSONB NOT NULL,
    "min_order" DECIMAL(6,2),
    "delivery_fee" DECIMAL(4,2) NOT NULL,
    "estimated_time" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "pro_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(8,2) NOT NULL,
    "image" TEXT,
    "category" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_multiple" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionChoice" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_modifier" DECIMAL(6,2) NOT NULL DEFAULT 0,

    CONSTRAINT "OptionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "pro_id" TEXT NOT NULL,
    "rider_id" TEXT,
    "from_address_id" TEXT NOT NULL,
    "to_address_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "delivery_fee" DECIMAL(6,2) NOT NULL,
    "service_fee" DECIMAL(6,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "pro_earnings" DECIMAL(10,2) NOT NULL,
    "rider_earnings" DECIMAL(6,2) NOT NULL,
    "platform_earnings" DECIMAL(10,2) NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "estimated_delivery" TIMESTAMP(3),
    "client_note" TEXT,
    "delivery_photo" TEXT,
    "delivery_code" TEXT,
    "rating" INTEGER,
    "review" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(8,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "options" JSONB,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "note" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "type" "EarningType" NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "iban" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "department" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningHours" (
    "id" TEXT NOT NULL,
    "pro_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "pro_id" TEXT,
    "rider_id" TEXT,
    "order_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "pro_reply" TEXT,
    "pro_replied_at" TIMESTAMP(3),
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Client_user_id_key" ON "Client"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Client_referral_code_key" ON "Client"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "Pro_user_id_key" ON "Pro"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pro_siret_key" ON "Pro"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_user_id_key" ON "Rider"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_key_key" ON "GlobalSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_user_id_key" ON "Admin"("user_id");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pro" ADD CONSTRAINT "Pro_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rider" ADD CONSTRAINT "Rider_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryZone" ADD CONSTRAINT "DeliveryZone_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "ProductOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_from_address_id_fkey" FOREIGN KEY ("from_address_id") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_to_address_id_fkey" FOREIGN KEY ("to_address_id") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "Rider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningHours" ADD CONSTRAINT "OpeningHours_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
