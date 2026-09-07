import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createInterviewerAvailability,
  deleteInterviewerAvailability,
  listInterviewerAvailability,
  updateInterviewerAvailability,
} from './interviewers.service.js';
import { slotIdSchema } from '../candidates/candidates.validation.js';

export const listAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await listInterviewerAvailability(requireAuth(request).id);
    response.json({ success: true, data: { availability } });
  } catch (error) { next(error); }
};

export const createAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await createInterviewerAvailability(requireAuth(request).id, request.body);
    response.status(201).json({ success: true, data: { availability } });
  } catch (error) { next(error); }
};

export const updateAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await updateInterviewerAvailability(requireAuth(request).id, parseSlotId(request.params.slotId), request.body);
    response.json({ success: true, data: { availability } });
  } catch (error) { next(error); }
};

export const deleteAvailability: RequestHandler = async (request, response, next) => {
  try {
    await deleteInterviewerAvailability(requireAuth(request).id, parseSlotId(request.params.slotId));
    response.json({ success: true, data: { message: 'Availability deleted successfully' } });
  } catch (error) { next(error); }
};

function requireAuth(request: Parameters<RequestHandler>[0]): NonNullable<typeof request.auth> {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth;
}

function parseSlotId(value: unknown): string {
  const result = slotIdSchema.safeParse(value);
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Slot ID is invalid');
  return result.data;
}
