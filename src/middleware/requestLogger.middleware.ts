import { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(`${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs.toFixed(1)}ms`);
  });

  next();
};
