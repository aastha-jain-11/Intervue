import { ErrorRequestHandler, RequestHandler } from 'express';

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
  const statusCode = appError?.statusCode ?? 500;
  const code = appError?.code ?? 'INTERNAL_ERROR';
  const message = appError?.message ?? 'An unexpected error occurred';

  if (statusCode >= 500) {
    console.error(error instanceof Error ? error.message : 'Unknown error');
  }

  response.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};
