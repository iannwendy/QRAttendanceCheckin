-- Set default AFTER enum values exist and previous migration committed
ALTER TABLE "Attendance" ALTER COLUMN "status" SET DEFAULT 'NOT_ATTENDED';


