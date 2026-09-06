import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getInternalServiceConfig,
  InternalServiceClient,
  InternalServiceConfigurationError,
  InternalServiceError,
} from '../src/services/internal-service-client.js';

const serviceEnvironment = {
  RESUME_SERVICE_URL: 'http://resume.internal:8001',
  RESUME_SERVICE_TOKEN: 'resume-secret-token',
  NOTIFICATION_SERVICE_URL: 'http://notification.internal:8002',
  NOTIFICATION_SERVICE_TOKEN: 'notification-secret-token',
  RESUME_SERVICE_SCREENING_TIMEOUT_MS: '30000',
  RESUME_SERVICE_COMPUTE_TIMEOUT_MS: '10000',
  NOTIFICATION_SERVICE_TIMEOUT_MS: '10000',
};

test('loads internal service URLs and timeouts without exposing tokens in configuration errors', () => {
  const config = getInternalServiceConfig('resume', serviceEnvironment);
  assert.equal(config.url, serviceEnvironment.RESUME_SERVICE_URL);
  assert.equal(config.timeouts.screeningMs, 30_000);
  assert.equal(config.timeouts.computeMs, 10_000);

  assert.throws(
    () => getInternalServiceConfig('notification', { ...serviceEnvironment, NOTIFICATION_SERVICE_TOKEN: undefined }),
    (error: unknown) => {
      assert(error instanceof InternalServiceConfigurationError);
      assert.equal(error.message.includes(serviceEnvironment.NOTIFICATION_SERVICE_TOKEN), false);
      return true;
    },
  );
});

test('adds a service token and applies the requested timeout', async () => {
  const config = getInternalServiceConfig('notification', serviceEnvironment);
  let authorization = '';
  let timeoutWasApplied = false;
  const client = new InternalServiceClient('notification', config, async (_url, init) => {
    authorization = new Headers(init?.headers).get('authorization') ?? '';
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        timeoutWasApplied = true;
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  });

  await assert.rejects(
    client.request('/health', {}, 1),
    (error: unknown) => error instanceof InternalServiceError && error.code === 'INTERNAL_SERVICE_TIMEOUT',
  );
  assert.equal(authorization, `Bearer ${serviceEnvironment.NOTIFICATION_SERVICE_TOKEN}`);
  assert.equal(timeoutWasApplied, true);
});

test('does not surface internal service response details', async () => {
  const client = new InternalServiceClient('resume', getInternalServiceConfig('resume', serviceEnvironment), async () => {
    return new Response('python traceback: secret implementation detail', { status: 500 });
  });

  await assert.rejects(
    client.request('/screen', {}, 100),
    (error: unknown) => {
      assert(error instanceof InternalServiceError);
      assert.equal(error.message.includes('python traceback'), false);
      return true;
    },
  );
});
