BEGIN;

CREATE TYPE "JobStatus" AS ENUM ('draft', 'open', 'closed');
CREATE TYPE "ApplicationScreeningStatus" AS ENUM ('pending', 'processing', 'passed', 'failed');
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'screening', 'shortlisted', 'interviewing', 'selected', 'rejected');
CREATE TYPE "PipelineStageStatus" AS ENUM ('pending', 'in_progress', 'scheduled', 'completed', 'selected', 'rejected', 'no_show', 'cancelled');
CREATE TYPE "InterviewRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
CREATE TYPE "ModelType" AS ENUM ('resume_screening', 'interviewer_matching', 'slot_recommendation');
CREATE TYPE "ModelRunStatus" AS ENUM ('processing', 'completed', 'failed');

CREATE TYPE "UserRole_new" AS ENUM ('candidate', 'interviewer', 'ta_admin');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new"
  USING (CASE "role"::text
    WHEN 'recruiter' THEN 'candidate'::"UserRole_new"
    ELSE "role"::text::"UserRole_new"
  END);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

CREATE TABLE "Interviewer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "jobRole" TEXT NOT NULL,
  "interviewerType" "InterviewerType" NOT NULL,
  "experienceYears" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "workingHours" JSONB,
  "skills" TEXT[] NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Interviewer_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Interviewer" ("id", "userId", "name", "email", "jobRole", "interviewerType", "experienceYears", "timezone", "workingHours", "skills", "isAvailable", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", "name", "email", '', COALESCE("interviewerType", 'screening'::"InterviewerType"), 0, "timezone", "workingHours", "skillTags", "isActive", "createdAt", "updatedAt"
FROM "User"
WHERE "role" = 'interviewer';

CREATE UNIQUE INDEX "Interviewer_userId_key" ON "Interviewer"("userId");
CREATE UNIQUE INDEX "Interviewer_email_key" ON "Interviewer"("email");
ALTER TABLE "Interviewer" ADD CONSTRAINT "Interviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Candidate" ADD COLUMN "userId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "phone" TEXT;
UPDATE "Candidate" c SET "userId" = u."id"
FROM "User" u
WHERE lower(c."email") = lower(u."email") AND u."role" = 'candidate';
INSERT INTO "Candidate" ("id", "userId", "name", "email", "timezone", "createdAt", "updatedAt")
SELECT gen_random_uuid(), u."id", u."name", u."email", u."timezone", u."createdAt", u."updatedAt"
FROM "User" u
LEFT JOIN "Candidate" c ON c."userId" = u."id"
WHERE u."role" = 'candidate' AND c."id" IS NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Candidate" WHERE "userId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete migration: Candidate rows without matching candidate User accounts exist';
  END IF;
END $$;
ALTER TABLE "Candidate" ALTER COLUMN "userId" SET NOT NULL;
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Application" RENAME COLUMN "createdAt" TO "appliedAt";
ALTER TABLE "Application" ADD COLUMN "resumeUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted';
ALTER TABLE "Application" ALTER COLUMN "screeningStatus" TYPE "ApplicationScreeningStatus"
  USING COALESCE(NULLIF("screeningStatus", ''), 'pending')::"ApplicationScreeningStatus";
ALTER TABLE "Application" ALTER COLUMN "screeningStatus" SET DEFAULT 'pending';
ALTER TABLE "Application" ALTER COLUMN "screeningStatus" SET NOT NULL;

ALTER TABLE "PipelineStage" DROP CONSTRAINT IF EXISTS "PipelineStage_scheduledEventId_fkey";
DROP INDEX IF EXISTS "PipelineStage_scheduledEventId_key";
DROP INDEX IF EXISTS "PipelineStage_applicationId_roundOrder_idx";
ALTER TABLE "PipelineStage" RENAME COLUMN "roundOrder" TO "stageOrder";
ALTER TABLE "PipelineStage" RENAME COLUMN "scheduledEventId" TO "scheduledInterviewId";
ALTER TABLE "PipelineStage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PipelineStage" ALTER COLUMN "status" TYPE "PipelineStageStatus"
  USING "status"::text::"PipelineStageStatus";
ALTER TABLE "PipelineStage" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "PipelineStage" DROP COLUMN "completedAt";
DROP TYPE "PipelineStatus";
CREATE UNIQUE INDEX "PipelineStage_scheduledInterviewId_key" ON "PipelineStage"("scheduledInterviewId");
CREATE INDEX "PipelineStage_applicationId_stageOrder_idx" ON "PipelineStage"("applicationId", "stageOrder");

ALTER TABLE "Interview" DROP CONSTRAINT IF EXISTS "Interview_applicationId_fkey";
ALTER TABLE "Interview" DROP CONSTRAINT IF EXISTS "Interview_pipelineStageId_fkey";
ALTER TABLE "Interview" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "InterviewStatus_new" AS ENUM ('pending', 'interviewer_requested', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show');
ALTER TABLE "Interview" ALTER COLUMN "status" TYPE "InterviewStatus_new"
  USING (CASE "status"::text
    WHEN 'requested' THEN 'interviewer_requested'::"InterviewStatus_new"
    WHEN 'slots_generated' THEN 'interviewer_requested'::"InterviewStatus_new"
    WHEN 'booked' THEN 'confirmed'::"InterviewStatus_new"
    ELSE "status"::text::"InterviewStatus_new"
  END);
ALTER TYPE "InterviewStatus" RENAME TO "InterviewStatus_old";
ALTER TYPE "InterviewStatus_new" RENAME TO "InterviewStatus";
DROP TYPE "InterviewStatus_old";
ALTER TABLE "Interview" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Interview" ADD COLUMN "selectedInterviewerId" TEXT;
ALTER TABLE "Interview" ADD COLUMN "selectedSlot" TIMESTAMP(3);
ALTER TABLE "Interview" ADD COLUMN "meetLink" TEXT;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_pipelineStageId_key" UNIQUE ("pipelineStageId");

ALTER TABLE "InterviewParticipant" DROP CONSTRAINT IF EXISTS "InterviewParticipant_userId_fkey";
DROP INDEX IF EXISTS "InterviewParticipant_interviewId_userId_key";
ALTER TABLE "InterviewParticipant" ADD COLUMN "interviewerId" TEXT;
UPDATE "InterviewParticipant" p SET "interviewerId" = i."id"
FROM "Interviewer" i
WHERE p."userId" = i."userId";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "InterviewParticipant" WHERE "interviewerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete migration: InterviewParticipant rows without matching Interviewer profiles exist';
  END IF;
END $$;
ALTER TABLE "InterviewParticipant" ALTER COLUMN "interviewerId" SET NOT NULL;
ALTER TABLE "InterviewParticipant" DROP COLUMN "userId";
CREATE UNIQUE INDEX "InterviewParticipant_interviewId_interviewerId_key" ON "InterviewParticipant"("interviewId", "interviewerId");
ALTER TABLE "InterviewParticipant" ADD CONSTRAINT "InterviewParticipant_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AvailabilitySlot" DROP CONSTRAINT IF EXISTS "AvailabilitySlot_userId_fkey";
DROP INDEX IF EXISTS "AvailabilitySlot_userId_startUtc_endUtc_idx";
ALTER TABLE "AvailabilitySlot" ADD COLUMN "interviewerId" TEXT;
UPDATE "AvailabilitySlot" a SET "interviewerId" = i."id"
FROM "Interviewer" i
WHERE a."userId" = i."userId";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "AvailabilitySlot" WHERE "userId" IS NOT NULL AND "interviewerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete migration: AvailabilitySlot rows without matching Interviewer profiles exist';
  END IF;
END $$;
ALTER TABLE "AvailabilitySlot" DROP COLUMN "userId";
CREATE INDEX "AvailabilitySlot_interviewerId_startUtc_endUtc_idx" ON "AvailabilitySlot"("interviewerId", "startUtc", "endUtc");
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "CalendarEvent_interviewId_fkey";
ALTER TABLE "CalendarEvent" DROP CONSTRAINT IF EXISTS "PipelineStage_scheduledEventId_fkey";
DROP INDEX IF EXISTS "CalendarEvent_slotStartUtc_slotEndUtc_idx";
ALTER TABLE "CalendarEvent" RENAME COLUMN "slotStartUtc" TO "slot";
ALTER TABLE "CalendarEvent" DROP COLUMN "slotEndUtc";
ALTER TABLE "CalendarEvent" ADD COLUMN "interviewerId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "candidateId" TEXT;
UPDATE "CalendarEvent" e SET "candidateId" = a."candidateId"
FROM "Interview" i JOIN "Application" a ON a."id" = i."applicationId"
WHERE e."interviewId" = i."id";
UPDATE "CalendarEvent" e SET "interviewerId" = i."selectedInterviewerId"
FROM "Interview" i
WHERE e."interviewId" = i."id";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CalendarEvent" WHERE "candidateId" IS NULL OR "interviewerId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot complete migration: CalendarEvent rows lack candidate or interviewer ownership';
  END IF;
END $$;
ALTER TABLE "CalendarEvent" ALTER COLUMN "candidateId" SET NOT NULL;
ALTER TABLE "CalendarEvent" ALTER COLUMN "interviewerId" SET NOT NULL;
ALTER TABLE "CalendarEvent" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "CalendarEventStatus_new" AS ENUM ('created', 'updated', 'cancelled');
ALTER TABLE "CalendarEvent" ALTER COLUMN "status" TYPE "CalendarEventStatus_new"
  USING (CASE "status"::text WHEN 'scheduled' THEN 'created'::"CalendarEventStatus_new" ELSE "status"::text::"CalendarEventStatus_new" END);
ALTER TYPE "CalendarEventStatus" RENAME TO "CalendarEventStatus_old";
ALTER TYPE "CalendarEventStatus_new" RENAME TO "CalendarEventStatus";
DROP TYPE "CalendarEventStatus_old";
ALTER TABLE "CalendarEvent" ALTER COLUMN "status" SET DEFAULT 'created';
CREATE INDEX "CalendarEvent_slot_idx" ON "CalendarEvent"("slot");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NotificationLog" DROP CONSTRAINT IF EXISTS "NotificationLog_candidateId_fkey";
ALTER TABLE "NotificationLog" ADD COLUMN "recipientType" TEXT;
ALTER TABLE "NotificationLog" ADD COLUMN "recipientId" TEXT;
UPDATE "NotificationLog" SET "recipientType" = CASE WHEN "candidateId" IS NOT NULL THEN 'candidate' ELSE 'external' END,
  "recipientId" = COALESCE("candidateId", "recipient");
ALTER TABLE "NotificationLog" ALTER COLUMN "recipientType" SET NOT NULL;
ALTER TABLE "NotificationLog" ALTER COLUMN "recipientId" SET NOT NULL;
ALTER TABLE "NotificationLog" DROP COLUMN "candidateId";
ALTER TABLE "NotificationLog" DROP COLUMN "recipient";
ALTER TABLE "NotificationLog" DROP COLUMN "errorMessage";
ALTER TABLE "NotificationLog" DROP COLUMN "sentAt";
ALTER TABLE "NotificationLog" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "NotificationStatus_new" AS ENUM ('pending', 'sent', 'delivered', 'failed');
ALTER TABLE "NotificationLog" ALTER COLUMN "status" TYPE "NotificationStatus_new"
  USING (CASE "status"::text WHEN 'read' THEN 'delivered'::"NotificationStatus_new" ELSE "status"::text::"NotificationStatus_new" END);
ALTER TYPE "NotificationStatus" RENAME TO "NotificationStatus_old";
ALTER TYPE "NotificationStatus_new" RENAME TO "NotificationStatus";
DROP TYPE "NotificationStatus_old";
ALTER TABLE "NotificationLog" ALTER COLUMN "status" SET DEFAULT 'pending';
CREATE INDEX "NotificationLog_recipientType_recipientId_idx" ON "NotificationLog"("recipientType", "recipientId");
CREATE INDEX "NotificationLog_interviewId_idx" ON "NotificationLog"("interviewId");

ALTER TABLE "User" DROP COLUMN "interviewerType";
ALTER TABLE "User" DROP COLUMN "workingHours";
ALTER TABLE "User" DROP COLUMN "skillTags";

CREATE TABLE "InterviewerMatch" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "interviewerId" TEXT NOT NULL,
  "matchScore" DECIMAL(65,30),
  "rank" INTEGER NOT NULL,
  "skillMatchScore" DECIMAL(65,30),
  "experienceMatchScore" DECIMAL(65,30),
  "roleMatchScore" DECIMAL(65,30),
  "reason" TEXT,
  "modelVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewerMatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SlotRecommendation" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "slot" TIMESTAMP(3) NOT NULL,
  "priorityScore" DECIMAL(65,30),
  "rank" INTEGER NOT NULL,
  "workingHoursScore" DECIMAL(65,30),
  "bufferBeforeScore" DECIMAL(65,30),
  "bufferAfterScore" DECIMAL(65,30),
  "candidatePreferenceScore" DECIMAL(65,30),
  "reason" TEXT,
  "modelVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SlotRecommendation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InterviewRequest" (
  "id" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "interviewerId" TEXT NOT NULL,
  "slot" TIMESTAMP(3) NOT NULL,
  "status" "InterviewRequestStatus" NOT NULL DEFAULT 'pending',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "InterviewRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ModelRun" (
  "id" TEXT NOT NULL,
  "modelType" "ModelType" NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "inputReferenceId" TEXT NOT NULL,
  "inputData" JSONB,
  "outputData" JSONB,
  "status" "ModelRunStatus" NOT NULL DEFAULT 'processing',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "applicationId" TEXT,
  CONSTRAINT "ModelRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewerMatch_interviewId_idx" ON "InterviewerMatch"("interviewId");
CREATE INDEX "InterviewerMatch_interviewerId_idx" ON "InterviewerMatch"("interviewerId");
CREATE INDEX "InterviewerMatch_interviewId_rank_idx" ON "InterviewerMatch"("interviewId", "rank");
CREATE INDEX "SlotRecommendation_interviewId_idx" ON "SlotRecommendation"("interviewId");
CREATE INDEX "SlotRecommendation_interviewId_rank_idx" ON "SlotRecommendation"("interviewId", "rank");
CREATE INDEX "InterviewRequest_interviewId_idx" ON "InterviewRequest"("interviewId");
CREATE INDEX "InterviewRequest_interviewerId_idx" ON "InterviewRequest"("interviewerId");
CREATE INDEX "InterviewRequest_status_idx" ON "InterviewRequest"("status");
CREATE INDEX "ModelRun_modelType_inputReferenceId_idx" ON "ModelRun"("modelType", "inputReferenceId");

ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_scheduledInterviewId_fkey" FOREIGN KEY ("scheduledInterviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_pipelineStageId_fkey" FOREIGN KEY ("pipelineStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_selectedInterviewerId_fkey" FOREIGN KEY ("selectedInterviewerId") REFERENCES "Interviewer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewerMatch" ADD CONSTRAINT "InterviewerMatch_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewerMatch" ADD CONSTRAINT "InterviewerMatch_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SlotRecommendation" ADD CONSTRAINT "SlotRecommendation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewRequest" ADD CONSTRAINT "InterviewRequest_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewRequest" ADD CONSTRAINT "InterviewRequest_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Interviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModelRun" ADD CONSTRAINT "ModelRun_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
