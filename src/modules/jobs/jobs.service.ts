import { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateJobInput, JobQuery, UpdateJobInput } from './jobs.validation.js';

const jobSelect = {
  id: true,
  title: true,
  description: true,
  department: true,
  location: true,
  experienceMin: true,
  experienceMax: true,
  requiredSkills: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, role: true } },
} satisfies Prisma.JobSelect;

type JobView = Prisma.JobGetPayload<{ select: typeof jobSelect }>;

export async function createJob(input: CreateJobInput, actorUserId: string): Promise<JobView> {
  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.create({
      data: {
        ...input,
        createdById: actorUserId,
      },
      select: jobSelect,
    });

    await transaction.auditLog.create({
      data: {
        actorUserId,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: job.id,
        metadata: { status: job.status, title: job.title },
      },
    });

    return job;
  });
}

export async function listJobs(query: JobQuery): Promise<JobView[]> {
  const where: Prisma.JobWhereInput = {
    status: query.status,
    department: query.department ? { equals: query.department, mode: 'insensitive' } : undefined,
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return prisma.job.findMany({ where, orderBy: { createdAt: 'desc' }, select: jobSelect });
}

export async function getJob(jobId: string): Promise<JobView> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: jobSelect });

  if (!job) {
    throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found');
  }

  return job;
}

export async function updateJob(jobId: string, input: UpdateJobInput, actorUserId: string): Promise<JobView> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const job = await transaction.job.update({ where: { id: jobId }, data: input, select: jobSelect });

      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'JOB_UPDATED',
          entityType: 'Job',
          entityId: job.id,
          metadata: { fields: Object.keys(input) },
        },
      });

      return job;
    });
  } catch (error) {
    throwJobNotFound(error);
  }
}

export async function updateJobStatus(jobId: string, status: JobStatus, actorUserId: string): Promise<JobView> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const job = await transaction.job.update({ where: { id: jobId }, data: { status }, select: jobSelect });

      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'JOB_STATUS_CHANGED',
          entityType: 'Job',
          entityId: job.id,
          metadata: { status },
        },
      });

      return job;
    });
  } catch (error) {
    throwJobNotFound(error);
  }
}

function throwJobNotFound(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found');
  }

  throw error;
}
