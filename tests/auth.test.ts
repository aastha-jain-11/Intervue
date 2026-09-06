import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, test } from 'node:test';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/middleware/error.middleware.js';
import { requireRole } from '../src/middleware/rbac.middleware.js';
import { authenticateGoogleUser } from '../src/modules/auth/auth.service.js';
import jwt from 'jsonwebtoken';

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
  await prisma.oAuthAccount.deleteMany({ where: { user: { email: { startsWith: 'oauth-test-' } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'oauth-test-' } } });
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

test('existing user can be linked to a verified Google identity', async () => {
  const user = await prisma.user.create({
    data: {
      name: 'Existing OAuth Link',
      email: 'oauth-test-existing@example.com',
      passwordHash: 'existing-password-hash',
      role: 'interviewer',
      timezone: 'UTC',
      skillTags: [],
    },
  });

  const result = await authenticateGoogleUser({
    providerAccountId: 'google-existing-account',
    email: user.email,
    name: user.name,
  });
  const account = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: 'google-existing-account',
      },
    },
  });

  assert.equal(result.user.id, user.id);
  assert.equal(account?.userId, user.id);
  assert.equal(result.user.passwordHash, undefined);
});

test('existing OAuth account resolves to its associated user', async () => {
  const user = await prisma.user.create({
    data: {
      name: 'OAuth Account Owner',
      email: 'oauth-test-account@example.com',
      passwordHash: 'existing-password-hash',
      role: 'recruiter',
      timezone: 'UTC',
      skillTags: [],
      oauthAccounts: {
        create: { provider: 'google', providerAccountId: 'google-known-account' },
      },
    },
  });

  const result = await authenticateGoogleUser({
    providerAccountId: 'google-known-account',
    email: 'different@example.com',
    name: 'Ignored Name',
  });

  assert.equal(result.user.id, user.id);
});

test('new Google identity creates a recruiter account and application JWT', async () => {
  const result = await authenticateGoogleUser({
    providerAccountId: 'google-new-account',
    email: 'oauth-test-new@example.com',
    name: 'New OAuth User',
  });
  const createdUser = await prisma.user.findUnique({
    where: { email: 'oauth-test-new@example.com' },
    include: { oauthAccounts: true },
  });
  const tokenPayload = jwt.verify(result.token, env.JWT_SECRET) as { id: string; role: string };

  assert(createdUser);
  assert.equal(result.user.role, 'recruiter');
  assert.notEqual(result.user.role, 'ta_admin');
  assert.equal(createdUser.oauthAccounts[0]?.provider, 'google');
  assert.equal(tokenPayload.id, createdUser.id);
  assert.equal(tokenPayload.role, 'recruiter');
  assert.equal(result.user.passwordHash, undefined);

  const { server, url } = await startTestServer();
  try {
    const meResponse = await request(`${url}/users/me`, {
      headers: { authorization: `Bearer ${result.token}` },
    });
    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.data?.user?.id, createdUser.id);
  } finally {
    await closeServer(server);
  }
});

test('OAuth callback failure uses the centralized error response', async () => {
  const { server, url } = await startTestServer();

  try {
    const response = await request(`${url}/auth/google/callback?error=access_denied`);
    assert.equal(response.status, 401);
    assert.equal(response.body.error?.code, 'OAUTH_FAILED');
  } finally {
    await closeServer(server);
  }
});
