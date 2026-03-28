/*
  Warnings:

  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add with default for existing rows, then drop default to match Prisma @updatedAt behavior
ALTER TABLE "Attendance" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
-- Backfill is implicit via default; remove default to avoid future implicit values
ALTER TABLE "Attendance" ALTER COLUMN "updatedAt" DROP DEFAULT;
