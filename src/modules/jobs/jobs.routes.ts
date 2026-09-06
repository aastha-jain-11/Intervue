import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { create, get, list, update, updateStatus } from './jobs.controller.js';
import { createJobSchema, updateJobSchema, updateJobStatusSchema } from './jobs.validation.js';

export const jobsRouter = Router();

jobsRouter.post('/api/jobs', authenticate, requireRole('ta_admin'), validateBody(createJobSchema), create);
jobsRouter.get('/api/jobs', authenticate, list);
jobsRouter.get('/api/jobs/:jobId', authenticate, get);
jobsRouter.put('/api/jobs/:jobId', authenticate, requireRole('ta_admin'), validateBody(updateJobSchema), update);
jobsRouter.patch('/api/jobs/:jobId/status', authenticate, requireRole('ta_admin'), validateBody(updateJobStatusSchema), updateStatus);
