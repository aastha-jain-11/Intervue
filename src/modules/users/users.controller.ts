import { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { getCurrentUser } from './users.service.js';

export const getMe: RequestHandler = async (request, response, next) => {
  try {
    if (!request.auth) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const user = await getCurrentUser(request.auth.id);
    response.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};
