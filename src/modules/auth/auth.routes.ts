import { Router } from 'express';
import { login, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';
import { validateBody } from '../../middleware/validation.middleware.js';

export const authRouter = Router();

authRouter.post('/auth/register', validateBody(registerSchema), register);
authRouter.post('/auth/login', validateBody(loginSchema), login);
