import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';

export type AuthenticatedUser = {
  id: string;
  role: 'recruiter' | 'interviewer' | 'ta_admin';
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

const validRoles = new Set<AuthenticatedUser['role']>(['recruiter', 'interviewer', 'ta_admin']);

export const authenticate: RequestHandler = (request: Request, _response: Response, next: NextFunction) => {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : request.cookies?.intervue_auth;

  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (typeof payload === 'string' || !isAuthenticatedUserPayload(payload)) {
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
      return;
    }

    request.auth = { id: payload.id, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired authentication token'));
  }
};

function isAuthenticatedUserPayload(payload: string | JwtPayload): payload is JwtPayload & AuthenticatedUser {
  return (
    typeof payload === 'object' &&
    typeof payload.id === 'string' &&
    typeof payload.role === 'string' &&
    validRoles.has(payload.role as AuthenticatedUser['role'])
  );
}
