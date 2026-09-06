import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { test } from 'node:test';
import { z } from 'zod';
import { validateBody } from '../src/middleware/validation.middleware.js';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/intervue?schema=public';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const appPromise = import('../src/app.js');

async function startTestServer(): Promise<{ server: Server; url: string }> {
  const { app } = await appPromise;

  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address !== 'string');
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function request(url: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

test('GET /health returns a successful health response', async () => {
  const { server, url } = await startTestServer();

  try {
    const response = await request(`${url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.success, true);
  } finally {
    await closeServer(server);
  }
});

test('unknown routes use the centralized error response', async () => {
  const { server, url } = await startTestServer();

  try {
    const response = await request(`${url}/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  } finally {
    await closeServer(server);
  }
});

test('validateBody returns a structured validation error for invalid input', () => {
  let statusCode = 0;
  let responseBody: Record<string, unknown> | undefined;
  let nextCalled = false;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(body: Record<string, unknown>) {
      responseBody = body;
      return response;
    },
  } as never;
  const request = { body: {} } as never;

  validateBody(z.object({ name: z.string().min(1) }))(request, response, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 400);
  assert.equal((responseBody?.error as { code: string }).code, 'VALIDATION_ERROR');
  assert.equal(nextCalled, false);
});