import { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const appError = error instanceof AppError ? error : null;
  const databaseUnavailable = !appError && (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001')
    || (error instanceof Prisma.PrismaClientInitializationError && error.errorCode === 'P1001')
  );
  const statusCode = appError?.statusCode ?? (databaseUnavailable ? 503 : 500);
  const code = appError?.code ?? (databaseUnavailable ? 'DATABASE_UNAVAILABLE' : 'INTERNAL_ERROR');
  const message = appError?.message ?? (databaseUnavailable ? 'The database is temporarily unavailable. Please try again.' : 'An unexpected error occurred');

  if (statusCode >= 500) {
    console.error(error instanceof Error ? error.message : 'Unknown error');
  }

  response.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};
