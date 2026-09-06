import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, test } from 'node:test';
import { prisma } from '../src/config/database.js';
import { AppError } from '../src/middleware/error.middleware.js';
import { requireRole } from '../src/middleware/rbac.middleware.js';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const appPromise = import('../src/app.js');
const testEmailPrefix = 'phase1-test-';

type ApiResponse = {
  status: number;
  body: {
    success: boolean;
    data?: {
      user?: { id: string; email: string; role: string; passwordHash?: string };
      token?: string;
    };
    error?: { code: string; message: string };
  };
};

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

async function request(url: string, options: RequestInit = {}): Promise<ApiResponse> {
  const response = await fetch(url, options);
  return { status: response.status, body: (await response.json()) as ApiResponse['body'] };
}

function jsonRequest(method: string, body: Record<string, string>, token?: string): RequestInit {
  return {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

function uniqueEmail(): string {
  return `${testEmailPrefix}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerUser(url: string, email = uniqueEmail()): Promise<ApiResponse> {
  return request(`${url}/auth/register`, jsonRequest('POST', {
    name: 'Phase One Tester',
    email,
    password: 'correct-horse-battery-staple',
    role: 'recruiter',
  }));
}

after(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: testEmailPrefix } } });
  await prisma.$disconnect();
});

test('successful registration returns a public user without passwordHash', async () => {
  const { server, url } = await startTestServer();

  try {
    const response = await registerUser(url);
    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert(response.body.data?.user);
    assert.equal(response.body.data.user.passwordHash, undefined);
  } finally {
    await closeServer(server);
  }
});

test('duplicate email registration is rejected', async () => {
  const { server, url } = await startTestServer();
  const email = uniqueEmail();

  try {
    assert.equal((await registerUser(url, email)).status, 201);
    const duplicate = await registerUser(url, email);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error?.code, 'EMAIL_ALREADY_REGISTERED');
  } finally {
    await closeServer(server);
  }
});

test('successful login returns a JWT and public user', async () => {
  const { server, url } = await startTestServer();
  const email = uniqueEmail();

  try {
    await registerUser(url, email);
    const response = await request(`${url}/auth/login`, jsonRequest('POST', {
      email,
      password: 'correct-horse-battery-staple',
    }));
    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data?.token, 'string');
    assert.equal(response.body.data?.user?.email, email);
    assert.equal(response.body.data?.user?.passwordHash, undefined);
  } finally {
    await closeServer(server);
  }
});

test('invalid password is rejected', async () => {
  const { server, url } = await startTestServer();
  const email = uniqueEmail();

  try {
    await registerUser(url, email);
    const response = await request(`${url}/auth/login`, jsonRequest('POST', {
      email,
      password: 'wrong-password',
    }));
    assert.equal(response.status, 401);
    assert.equal(response.body.error?.code, 'INVALID_CREDENTIALS');
  } finally {
    await closeServer(server);
  }
});

test('missing or invalid JWT is rejected for /users/me', async () => {
  const { server, url } = await startTestServer();

  try {
    const missing = await request(`${url}/users/me`);
    assert.equal(missing.status, 401);
    assert.equal(missing.body.error?.code, 'UNAUTHORIZED');

    const invalid = await request(`${url}/users/me`, {
      headers: { authorization: 'Bearer invalid-token' },
    });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.error?.code, 'UNAUTHORIZED');
  } finally {
    await closeServer(server);
  }
});

test('valid JWT returns the authenticated user from /users/me', async () => {
  const { server, url } = await startTestServer();
  const email = uniqueEmail();

  try {
    await registerUser(url, email);
    const loginResponse = await request(`${url}/auth/login`, jsonRequest('POST', {
      email,
      password: 'correct-horse-battery-staple',
    }));
    const token = loginResponse.body.data?.token;
    assert(token);

    const response = await request(`${url}/users/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.data?.user?.email, email);
    assert.equal(response.body.data?.user?.passwordHash, undefined);
  } finally {
    await closeServer(server);
  }
});

test('RBAC denies an unauthorized role', () => {
  const request = { auth: { id: 'user-id', role: 'recruiter' as const } } as never;
  let receivedError: unknown;

  requireRole('ta_admin')(request, {} as never, (error) => {
    receivedError = error;
  });

  assert(receivedError instanceof AppError);
  assert.equal((receivedError as AppError).statusCode, 403);
  assert.equal((receivedError as AppError).code, 'FORBIDDEN');
});
