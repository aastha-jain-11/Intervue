import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getMe } from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/users/me', authenticate, getMe);
