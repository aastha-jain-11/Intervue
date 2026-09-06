import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { jobsRouter } from './modules/jobs/jobs.routes.js';
import { candidatesRouter } from './modules/candidates/candidates.routes.js';
import { applicationsRouter } from './modules/applications/applications.routes.js';
import { interviewsRouter } from './modules/interviews/interviews.routes.js';
import { healthRouter } from './routes/health.routes';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use(healthRouter);
app.use(authRouter);
app.use(usersRouter);
app.use(jobsRouter);
app.use(candidatesRouter);
app.use(applicationsRouter);
app.use(interviewsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
