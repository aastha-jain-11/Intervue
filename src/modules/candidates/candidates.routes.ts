import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import {
  createAvailability,
  deleteAvailability,
  getProfile,
  listAvailability,
  updateAvailability,
  updateProfile,
} from './candidates.controller.js';
import { availabilitySchema, updateCandidateSchema } from './candidates.validation.js';

export const candidatesRouter = Router();
const candidateOnly = [authenticate, requireRole('candidate')];

candidatesRouter.get('/api/candidates/me', ...candidateOnly, getProfile);
candidatesRouter.put('/api/candidates/me', ...candidateOnly, validateBody(updateCandidateSchema), updateProfile);
candidatesRouter.get('/api/candidates/me/availability', ...candidateOnly, listAvailability);
candidatesRouter.post('/api/candidates/me/availability', ...candidateOnly, validateBody(availabilitySchema), createAvailability);
candidatesRouter.put('/api/candidates/me/availability/:slotId', ...candidateOnly, validateBody(availabilitySchema), updateAvailability);
candidatesRouter.delete('/api/candidates/me/availability/:slotId', ...candidateOnly, deleteAvailability);
