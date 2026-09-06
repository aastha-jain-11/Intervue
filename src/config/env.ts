import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1h'),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL must be a valid URL').optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RESUME_SERVICE_URL: z.string().url('RESUME_SERVICE_URL must be a valid URL').optional(),
  RESUME_SERVICE_TOKEN: z.string().min(1).optional(),
  NOTIFICATION_SERVICE_URL: z.string().url('NOTIFICATION_SERVICE_URL must be a valid URL').optional(),
  NOTIFICATION_SERVICE_TOKEN: z.string().min(1).optional(),
  RESUME_SERVICE_SCREENING_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  RESUME_SERVICE_COMPUTE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  NOTIFICATION_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export const env = envSchema.parse(process.env);
