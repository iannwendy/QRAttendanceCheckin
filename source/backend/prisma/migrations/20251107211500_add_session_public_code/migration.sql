-- Add optional publicCode column for human-friendly session codes
ALTER TABLE "Session"
ADD COLUMN "publicCode" TEXT;

CREATE UNIQUE INDEX "Session_publicCode_key" ON "Session"("publicCode");

