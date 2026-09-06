import { z } from 'zod';
import { env } from '../config/env.js';

export type InternalServiceName = 'resume' | 'notification';

export type InternalServiceConfig = {
  url: string;
  token: string;
  timeouts: {
    screeningMs: number;
    computeMs: number;
    dispatchMs: number;
  };
};

const timeoutSchema = z.object({
  RESUME_SERVICE_SCREENING_TIMEOUT_MS: z.coerce.number().int().positive(),
  RESUME_SERVICE_COMPUTE_TIMEOUT_MS: z.coerce.number().int().positive(),
  NOTIFICATION_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive(),
});

const resumeServiceConfigSchema = timeoutSchema.extend({
  RESUME_SERVICE_URL: z.string().url('RESUME_SERVICE_URL is required'),
  RESUME_SERVICE_TOKEN: z.string().min(1, 'RESUME_SERVICE_TOKEN is required'),
});

const notificationServiceConfigSchema = timeoutSchema.extend({
  NOTIFICATION_SERVICE_URL: z.string().url('NOTIFICATION_SERVICE_URL is required'),
  NOTIFICATION_SERVICE_TOKEN: z.string().min(1, 'NOTIFICATION_SERVICE_TOKEN is required'),
});

export class InternalServiceConfigurationError extends Error {
  constructor(service: InternalServiceName) {
    super(`Internal ${service} service configuration is incomplete`);
    this.name = 'InternalServiceConfigurationError';
  }
}

export class InternalServiceError extends Error {
  constructor(
    public readonly code: 'INTERNAL_SERVICE_TIMEOUT' | 'INTERNAL_SERVICE_UNAVAILABLE' | 'INTERNAL_SERVICE_FAILED',
    service: InternalServiceName,
  ) {
    super(`Internal ${service} service request failed`);
    this.name = 'InternalServiceError';
  }
}

export function getInternalServiceConfig(
  service: InternalServiceName,
  source: unknown = env,
): InternalServiceConfig {
  if (service === 'resume') {
    const result = resumeServiceConfigSchema.safeParse(source);
    if (!result.success) {
      throw new InternalServiceConfigurationError(service);
    }
    const config = result.data;
    return {
      url: config.RESUME_SERVICE_URL,
      token: config.RESUME_SERVICE_TOKEN,
      timeouts: {
        screeningMs: config.RESUME_SERVICE_SCREENING_TIMEOUT_MS,
        computeMs: config.RESUME_SERVICE_COMPUTE_TIMEOUT_MS,
        dispatchMs: config.NOTIFICATION_SERVICE_TIMEOUT_MS,
      },
    };
  }

  const result = notificationServiceConfigSchema.safeParse(source);
  if (!result.success) {
    throw new InternalServiceConfigurationError(service);
  }
  const config = result.data;
  return {
    url: config.NOTIFICATION_SERVICE_URL,
    token: config.NOTIFICATION_SERVICE_TOKEN,
    timeouts: {
      screeningMs: config.RESUME_SERVICE_SCREENING_TIMEOUT_MS,
      computeMs: config.RESUME_SERVICE_COMPUTE_TIMEOUT_MS,
      dispatchMs: config.NOTIFICATION_SERVICE_TIMEOUT_MS,
    },
  };
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class InternalServiceClient {
  constructor(
    private readonly service: InternalServiceName,
    private readonly config: InternalServiceConfig,
    private readonly fetchImplementation: FetchLike = fetch,
  ) {}

  async request(path: string, init: RequestInit = {}, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchImplementation(this.resolveUrl(path), {
        ...init,
        headers: {
          ...init.headers,
          authorization: `Bearer ${this.config.token}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new InternalServiceError('INTERNAL_SERVICE_FAILED', this.service);
      }

      return response;
    } catch (error) {
      if (error instanceof InternalServiceError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new InternalServiceError('INTERNAL_SERVICE_TIMEOUT', this.service);
      }

      throw new InternalServiceError('INTERNAL_SERVICE_UNAVAILABLE', this.service);
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveUrl(path: string): URL {
    const baseUrl = new URL(this.config.url);
    const resolvedUrl = new URL(path.replace(/^\/+/, ''), `${baseUrl.toString().replace(/\/$/, '')}/`);
    if (resolvedUrl.origin !== baseUrl.origin) {
      throw new InternalServiceError('INTERNAL_SERVICE_FAILED', this.service);
    }

    return resolvedUrl;
  }
}
