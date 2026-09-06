import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { create, get, recommendations, schedule, update } from './interviews.controller.js';
import { createInterviewSchema, scheduleInterviewSchema, updateInterviewSchema } from './interviews.validation.js';

export const interviewsRouter = Router();
interviewsRouter.post('/api/applications/:applicationId/interviews', authenticate, requireRole('ta_admin'), validateBody(createInterviewSchema), create);
interviewsRouter.get('/api/interviews/:interviewId', authenticate, get);
interviewsRouter.patch('/api/interviews/:interviewId', authenticate, requireRole('ta_admin'), validateBody(updateInterviewSchema), update);
interviewsRouter.post('/api/interviews/:interviewId/recommendations', authenticate, requireRole('ta_admin'), recommendations);
interviewsRouter.post('/api/interviews/:interviewId/schedule', authenticate, requireRole('ta_admin'), validateBody(scheduleInterviewSchema), schedule);
