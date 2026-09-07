import 'dotenv/config';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, test } from 'node:test';
import { prisma } from '../src/config/database.js';
import { createApplicationToken } from '../src/modules/auth/auth.service.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';

const appPromise = import('../src/app.js');
const testPrefix = `interviewer-test-${Date.now()}-`;

type ApiResponse = { success: boolean; data?: { availability?: Record<string, unknown> | Record<string, unknown>[]; message?: string }; error?: { code: string } };

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function request(url: string, options: RequestInit = {}): Promise<{ status: number; body: ApiResponse }> {
  const response = await fetch(url, options);
  return { status: response.status, body: (await response.json()) as ApiResponse };
}

function jsonRequest(method: string, body: unknown, token?: string): RequestInit {
  return { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) };
}

function authHeaders(token: string): HeadersInit { return { authorization: `Bearer ${token}` }; }

async function createInterviewer(email: string): Promise<{ userId: string; token: string }> {
  const user = await prisma.user.create({
    data: {
      name: 'Interviewer Tester', email, passwordHash: 'not-used', role: 'interviewer', timezone: 'UTC',
      interviewerProfile: { create: { name: 'Interviewer Tester', email, jobRole: 'Engineer', interviewerType: 'technical', experienceYears: 4, timezone: 'UTC', skills: ['TypeScript'] } },
    },
  });
  return { userId: user.id, token: createApplicationToken(user.id, user.role) };
}

test('interviewer availability APIs enforce RBAC, ownership, overlap, adjacency, and audit logging', async () => {
  const interviewerA = await createInterviewer(`${testPrefix}a@example.com`);
  const interviewerB = await createInterviewer(`${testPrefix}b@example.com`);
  const candidate = await prisma.user.create({ data: { name: 'Candidate Tester', email: `${testPrefix}candidate@example.com`, passwordHash: 'not-used', role: 'candidate', timezone: 'UTC' } });
  const baseStart = new Date(Date.now() + 60 * 60 * 1000);
  const baseEnd = new Date(baseStart.getTime() + 60 * 60 * 1000);
  const { server, url } = await startTestServer();

  try {
    assert.equal((await request(`${url}/api/interviewers/me/availability`, { headers: authHeaders(createApplicationToken(candidate.id, candidate.role)) })).status, 403);
    const created = await request(`${url}/api/interviewers/me/availability`, jsonRequest('POST', { startUtc: baseStart.toISOString(), endUtc: baseEnd.toISOString(), interviewerId: 'ignored' }, interviewerA.token));
    assert.equal(created.status, 201);
    const slotId = (created.body.data?.availability as Record<string, unknown> | undefined)?.id as string;
    assert(slotId);
    const listed = (await request(`${url}/api/interviewers/me/availability`, { headers: authHeaders(interviewerA.token) })).body.data?.availability as Record<string, unknown>[];
    assert.equal(listed.length, 1);
    assert.equal((await request(`${url}/api/interviewers/me/availability`, jsonRequest('POST', { startUtc: new Date(baseStart.getTime() + 30 * 60 * 1000).toISOString(), endUtc: new Date(baseEnd.getTime() + 30 * 60 * 1000).toISOString() }, interviewerA.token))).status, 409);
    assert.equal((await request(`${url}/api/interviewers/me/availability`, jsonRequest('POST', { startUtc: baseEnd.toISOString(), endUtc: new Date(baseEnd.getTime() + 60 * 60 * 1000).toISOString() }, interviewerA.token))).status, 201);
    assert.equal((await request(`${url}/api/interviewers/me/availability/${slotId}`, jsonRequest('PUT', { startUtc: baseStart.toISOString(), endUtc: baseEnd.toISOString() }, interviewerB.token))).status, 404);
    assert.equal((await request(`${url}/api/interviewers/me/availability/${slotId}`, { method: 'DELETE', headers: authHeaders(interviewerA.token) })).status, 200);
    const auditEvents = await prisma.auditLog.findMany({ where: { actorUserId: interviewerA.userId, entityType: 'AvailabilitySlot' } });
    assert.deepEqual(new Set(auditEvents.map((event) => event.action)), new Set(['INTERVIEWER_AVAILABILITY_CREATED', 'INTERVIEWER_AVAILABILITY_DELETED']));
  } finally {
    await closeServer(server);
  }
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { startsWith: testPrefix } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.availabilitySlot.deleteMany({ where: { interviewer: { userId: { in: userIds } } } });
  await prisma.interviewer.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});
