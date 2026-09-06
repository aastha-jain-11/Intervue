import express, { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/rbac.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { apply, get, list, screen } from './applications.controller.js';
import { applySchema } from './applications.validation.js';

export const applicationsRouter = Router();
applicationsRouter.post('/api/jobs/:jobId/applications', authenticate, requireRole('candidate'), validateBody(applySchema), apply);
applicationsRouter.get('/api/applications', authenticate, list);
applicationsRouter.get('/api/applications/:applicationId', authenticate, get);
applicationsRouter.post('/api/applications/:applicationId/screening', authenticate, express.raw({ type: 'application/pdf', limit: '10mb' }), screen);
