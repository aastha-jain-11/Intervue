import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { accept, autoSchedule, create, get, list, propose, recommendations, reject, schedule, slotRecommendations, update } from './interviews.controller.js';
import { createInterviewSchema, proposalSchema, scheduleInterviewSchema, updateInterviewSchema } from './interviews.validation.js';

export const interviewsRouter = Router();
interviewsRouter.post('/api/applications/:applicationId/interviews', authenticate, requireRole('ta_admin'), validateBody(createInterviewSchema), create);
interviewsRouter.get('/api/interviews', authenticate, list);
interviewsRouter.get('/api/interviews/:interviewId', authenticate, get);
interviewsRouter.patch('/api/interviews/:interviewId', authenticate, requireRole('ta_admin'), validateBody(updateInterviewSchema), update);
interviewsRouter.post('/api/interviews/:interviewId/recommendations', authenticate, requireRole('ta_admin'), recommendations);
interviewsRouter.get('/api/interviews/:interviewId/slot-recommendations', authenticate, requireRole('ta_admin'), slotRecommendations);
interviewsRouter.post('/api/interviews/:interviewId/schedule', authenticate, requireRole('ta_admin'), validateBody(scheduleInterviewSchema), schedule);
interviewsRouter.post('/api/interviews/:interviewId/proposal', authenticate, requireRole('ta_admin'), validateBody(proposalSchema), propose);
interviewsRouter.post('/api/interviews/:interviewId/accept', authenticate, requireRole('interviewer'), accept);
interviewsRouter.post('/api/interviews/:interviewId/reject', authenticate, requireRole('interviewer'), reject);
interviewsRouter.post('/api/interviews/:interviewId/auto-schedule', authenticate, requireRole('ta_admin'), autoSchedule);
