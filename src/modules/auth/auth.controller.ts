import { RequestHandler } from 'express';
import { loginUser, registerUser } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

export const register: RequestHandler = async (request, response, next) => {
  try {
    const user = await registerUser(request.body as RegisterInput);
    response.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (request, response, next) => {
  try {
    const result = await loginUser(request.body as LoginInput);
    response.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
