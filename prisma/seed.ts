import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type InterviewerType, type User } from '@prisma/client';

const prisma = new PrismaClient();
const configuredDemoPassword = process.env.DEMO_PASSWORD;
const demoEmails = {
  ta: process.env.DEMO_TA_EMAIL ?? 'demo-ta@intervue.local',
  candidate: process.env.DEMO_CANDIDATE_EMAIL ?? 'demo-candidate@intervue.local',
  interviewer: process.env.DEMO_INTERVIEWER_EMAIL ?? 'demo-interviewer@intervue.local',
};

if (!configuredDemoPassword || configuredDemoPassword.length < 8) {
  throw new Error('Set DEMO_PASSWORD to a local-only password with at least 8 characters before running the demo seed.');
}
const demoPassword = configuredDemoPassword;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const ta = await upsertUser(demoEmails.ta, 'Demo TA Admin', 'ta_admin', passwordHash);
  const candidateUser = await upsertUser(demoEmails.candidate, 'Demo Candidate', 'candidate', passwordHash);
  const interviewerUser = await upsertUser(demoEmails.interviewer, 'Demo Interviewer', 'interviewer', passwordHash);

  const candidate = await prisma.candidate.upsert({
    where: { userId: candidateUser.id },
    update: {},
    create: { userId: candidateUser.id, name: candidateUser.name, email: candidateUser.email, timezone: 'UTC' },
  });
  const interviewer = await prisma.interviewer.upsert({
    where: { userId: interviewerUser.id },
    update: {},
    create: { userId: interviewerUser.id, name: interviewerUser.name, email: interviewerUser.email, jobRole: 'Software Engineer', interviewerType: 'technical' satisfies InterviewerType, experienceYears: 5, timezone: 'UTC', skills: ['TypeScript', 'Backend', 'System Design'] },
  });

  const job = await prisma.job.findFirst({ where: { createdById: ta.id, title: 'Demo Software Engineer' } }) ?? await prisma.job.create({
    data: {
      title: 'Demo Software Engineer',
      description: 'Controlled demo role for the Intervue scheduling workflow.',
      department: 'Engineering',
      location: 'Remote',
      experienceMin: 3,
      experienceMax: 7,
      requiredSkills: ['TypeScript', 'Backend', 'System Design'],
      status: 'open',
      createdById: ta.id,
    },
  });

  const application = await prisma.application.upsert({
    where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
    update: {},
    create: {
      candidateId: candidate.id,
      jobId: job.id,
      status: 'shortlisted',
      screeningStatus: 'passed',
      pipelineStages: { create: { roundType: 'screening', stageOrder: 1, status: 'completed' } },
    },
  });

  const stage = await prisma.pipelineStage.findFirst({ where: { applicationId: application.id, roundType: 'technical' } }) ?? await prisma.pipelineStage.create({
    data: { applicationId: application.id, roundType: 'technical', stageOrder: 2, status: 'pending' },
  });

  const seedStart = new Date('2099-01-15T10:00:00.000Z');
  const seedEnd = new Date(seedStart.getTime() + 60 * 60 * 1000);
  await ensureAvailability({ candidateId: candidate.id, ownerType: 'candidate', startUtc: seedStart, endUtc: seedEnd });
  await ensureAvailability({ interviewerId: interviewer.id, ownerType: 'interviewer', startUtc: seedStart, endUtc: seedEnd });

  const existingInterview = await prisma.interview.findFirst({ where: { applicationId: application.id, roundType: 'technical' } });
  if (!existingInterview) {
    await prisma.interview.create({ data: { applicationId: application.id, pipelineStageId: stage.id, roundType: 'technical', durationMins: 60, status: 'pending' } });
  }

  console.info('Demo seed completed.');
}

async function upsertUser(email: string, name: string, role: 'candidate' | 'interviewer' | 'ta_admin', passwordHash: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== role) throw new Error(`Demo email ${email} already belongs to a different role.`);
    return existing;
  }
  return prisma.user.create({ data: { name, email, passwordHash, role, timezone: 'UTC' } });
}

async function ensureAvailability(input: { candidateId?: string; interviewerId?: string; ownerType: 'candidate' | 'interviewer'; startUtc: Date; endUtc: Date }): Promise<void> {
  const existing = await prisma.availabilitySlot.findFirst({ where: { ...input, startUtc: input.startUtc, endUtc: input.endUtc } });
  if (!existing) await prisma.availabilitySlot.create({ data: input });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Demo seed failed.');
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
