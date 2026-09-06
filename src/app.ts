import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { healthRouter } from './routes/health.routes';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use(healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);
