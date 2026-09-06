import { JobStatus } from '@prisma/client';
import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createJob,
  getJob,
  listJobs,
  updateJob,
  updateJobStatus,
} from './jobs.service.js';
import {
  jobIdSchema,
  jobQuerySchema,
} from './jobs.validation.js';
import type { CreateJobInput, UpdateJobInput, UpdateJobStatusInput } from './jobs.validation.js';

export const create: RequestHandler = async (request, response, next) => {
  try {
    const actor = requireAuth(request);
    const input = request.body as CreateJobInput;
    const job = await createJob(input, actor.id);
    response.status(201).json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

export const list: RequestHandler = async (request, response, next) => {
  try {
    const query = parseOrThrow(jobQuerySchema, request.query);
    const jobs = await listJobs(query);
    response.json({ success: true, data: { jobs, count: jobs.length } });
  } catch (error) {
    next(error);
  }
};

export const get: RequestHandler = async (request, response, next) => {
  try {
    const job = await getJob(parseJobId(request.params.jobId));
    response.json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (request, response, next) => {
  try {
    const actor = requireAuth(request);
    const input = request.body as UpdateJobInput;
    const job = await updateJob(parseJobId(request.params.jobId), input, actor.id);
    response.json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

export const updateStatus: RequestHandler = async (request, response, next) => {
  try {
    const actor = requireAuth(request);
    const input = request.body as UpdateJobStatusInput;
    const job = await updateJobStatus(parseJobId(request.params.jobId), input.status as JobStatus, actor.id);
    response.json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};

function requireAuth(request: Parameters<RequestHandler>[0]): NonNullable<typeof request.auth> {
  if (!request.auth) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  return request.auth;
}

function parseJobId(value: unknown): string {
  const result = jobIdSchema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Job ID is invalid');
  }

  return result.data;
}

function parseOrThrow<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request is invalid');
  }

  return result.data;
}
