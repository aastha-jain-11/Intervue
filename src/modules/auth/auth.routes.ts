import { Router } from 'express';
import { googleCallback, login, register, startGoogleAuth } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { validateBody } from '../../middleware/validation.middleware.js';

export const authRouter = Router();

authRouter.post('/auth/register', validateBody(registerSchema), register);
authRouter.post('/auth/login', validateBody(loginSchema), login);
authRouter.get('/auth/google', startGoogleAuth);
authRouter.get('/auth/google/callback', googleCallback);
