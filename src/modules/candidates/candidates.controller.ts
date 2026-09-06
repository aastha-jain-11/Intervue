import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import {
  createCandidateAvailability,
  deleteCandidateAvailability,
  getCandidateProfile,
  listCandidateAvailability,
  updateCandidateAvailability,
  updateCandidateProfile,
} from './candidates.service.js';
import { slotIdSchema } from './candidates.validation.js';

export const getProfile: RequestHandler = async (request, response, next) => {
  try {
    const candidate = await getCandidateProfile(requireAuth(request).id);
    response.json({ success: true, data: { candidate } });
  } catch (error) {
    next(error);
  }
};

export const updateProfile: RequestHandler = async (request, response, next) => {
  try {
    const candidate = await updateCandidateProfile(requireAuth(request).id, request.body);
    response.json({ success: true, data: { candidate } });
  } catch (error) {
    next(error);
  }
};

export const listAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await listCandidateAvailability(requireAuth(request).id);
    response.json({ success: true, data: { availability } });
  } catch (error) {
    next(error);
  }
};

export const createAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await createCandidateAvailability(requireAuth(request).id, request.body);
    response.status(201).json({ success: true, data: { availability } });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability: RequestHandler = async (request, response, next) => {
  try {
    const availability = await updateCandidateAvailability(
      requireAuth(request).id,
      parseSlotId(request.params.slotId),
      request.body,
    );
    response.json({ success: true, data: { availability } });
  } catch (error) {
    next(error);
  }
};

export const deleteAvailability: RequestHandler = async (request, response, next) => {
  try {
    await deleteCandidateAvailability(requireAuth(request).id, parseSlotId(request.params.slotId));
    response.json({ success: true, data: { message: 'Availability deleted successfully' } });
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

function parseSlotId(value: unknown): string {
  const result = slotIdSchema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Slot ID is invalid');
  }

  return result.data;
}
