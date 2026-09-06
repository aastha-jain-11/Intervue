-- Add the fields already represented by the Prisma Job model.
ALTER TABLE "Job"
  ADD COLUMN "department" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "experienceMin" INTEGER,
  ADD COLUMN "experienceMax" INTEGER,
  ADD COLUMN "status" "JobStatus" NOT NULL DEFAULT 'draft';