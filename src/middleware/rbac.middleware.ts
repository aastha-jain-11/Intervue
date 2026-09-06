import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './error.middleware.js';
import type { AuthenticatedUser } from './auth.middleware.js';

type UserRole = AuthenticatedUser['role'];

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!roles.includes(request.auth.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }

    next();
  };
}
