-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('POTHOLE', 'GARBAGE', 'WATER_LOGGING', 'TRAFFIC_INCIDENT', 'UNAUTHORIZED_CONSTRUCTION', 'STREET_LIGHT_FAILURE', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('REPORTED', 'VERIFIED', 'ESCALATED', 'IN_PROGRESS', 'RESOLVED', 'FRAUD');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'REPORTED',
    "confidence_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "is_authority_proof" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
