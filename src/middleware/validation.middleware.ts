import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      response.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body is invalid',
          details: result.error.flatten().fieldErrors,
        },
      });
      return;
    }

    request.body = result.data;
    next();
  };
}

export const emptyBodySchema = z.object({});
