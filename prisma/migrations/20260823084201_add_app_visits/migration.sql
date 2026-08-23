-- CreateEnum
CREATE TYPE "AppSource" AS ENUM ('WWW', 'CLIENT', 'PRO', 'LIVREUR');

-- CreateTable
CREATE TABLE "app_visits" (
    "id" TEXT NOT NULL,
    "app" "AppSource" NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT,
    "device_type" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_visits_app_created_at_idx" ON "app_visits"("app", "created_at");

-- CreateIndex
CREATE INDEX "app_visits_session_id_idx" ON "app_visits"("session_id");
