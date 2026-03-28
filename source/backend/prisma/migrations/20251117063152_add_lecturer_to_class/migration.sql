-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "lecturerId" TEXT;

-- CreateIndex
CREATE INDEX "Class_lecturerId_idx" ON "Class"("lecturerId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
