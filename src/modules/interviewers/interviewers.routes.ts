import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { availabilitySchema } from '../candidates/candidates.validation.js';
import { createAvailability, deleteAvailability, listAvailability, updateAvailability } from './interviewers.controller.js';

export const interviewersRouter = Router();
const interviewerOnly = [authenticate, requireRole('interviewer')];

interviewersRouter.get('/api/interviewers/me/availability', ...interviewerOnly, listAvailability);
interviewersRouter.post('/api/interviewers/me/availability', ...interviewerOnly, validateBody(availabilitySchema), createAvailability);
interviewersRouter.put('/api/interviewers/me/availability/:slotId', ...interviewerOnly, validateBody(availabilitySchema), updateAvailability);
interviewersRouter.delete('/api/interviewers/me/availability/:slotId', ...interviewerOnly, deleteAvailability);
