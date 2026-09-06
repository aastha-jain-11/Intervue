import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.json({
    success: true,
    data: {
      status: 'ok',
      service: 'intervue-backend',
      timestamp: new Date().toISOString(),
    },
  });
});
