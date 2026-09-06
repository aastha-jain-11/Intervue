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
const testPrefix = `candidate-test-${Date.now()}-`;

type ApiResponse = {
  success: boolean;
  data?: {
    candidate?: Record<string, unknown>;
    availability?: Record<string, unknown>[];
    message?: string;
  };
  error?: { code: string };
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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function request(url: string, options: RequestInit = {}): Promise<{ status: number; body: ApiResponse }> {
  const response = await fetch(url, options);
  return { status: response.status, body: (await response.json()) as ApiResponse };
}

function jsonRequest(method: string, body: unknown, token?: string): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  };
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` };
}

function slot(start: string, end: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { startUtc: start, endUtc: end, ...extra };
}

async function createCandidate(email: string, withProfile = true): Promise<{ userId: string; candidateId?: string; token: string }> {
  const user = await prisma.user.create({
    data: { name: 'Candidate Tester', email, passwordHash: 'not-used', role: 'candidate', timezone: 'UTC' },
  });
  const candidate = withProfile
    ? await prisma.candidate.create({
        data: { userId: user.id, name: user.name, email: user.email, timezone: 'UTC' },
      })
    : undefined;

  return { userId: user.id, candidateId: candidate?.id, token: createApplicationToken(user.id, user.role) };
}

test('candidate profile and availability APIs enforce ownership, validation, and audit logging', async () => {
  const candidateA = await createCandidate(`${testPrefix}a@example.com`);
  const candidateB = await createCandidate(`${testPrefix}b@example.com`);
  const noProfileCandidate = await createCandidate(`${testPrefix}missing@example.com`, false);
  const interviewer = await prisma.user.create({
    data: { name: 'Candidate Interviewer', email: `${testPrefix}interviewer@example.com`, passwordHash: 'not-used', role: 'interviewer', timezone: 'UTC' },
  });
  const ta = await prisma.user.create({
    data: { name: 'Candidate TA', email: `${testPrefix}ta@example.com`, passwordHash: 'not-used', role: 'ta_admin', timezone: 'UTC' },
  });
  const interviewerToken = createApplicationToken(interviewer.id, interviewer.role);
  const taToken = createApplicationToken(ta.id, ta.role);
  const { server, url } = await startTestServer();

  try {
    assert.equal((await request(`${url}/api/candidates/me`)).status, 401);
    assert.equal((await request(`${url}/api/candidates/me`, { headers: authHeaders(interviewerToken) })).status, 403);
    assert.equal((await request(`${url}/api/candidates/me`, { headers: authHeaders(taToken) })).status, 403);

    const profile = await request(`${url}/api/candidates/me`, { headers: authHeaders(candidateA.token) });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data?.candidate?.id, candidateA.candidateId);
    assert.equal('passwordHash' in (profile.body.data?.candidate ?? {}), false);
    assert.equal('userId' in (profile.body.data?.candidate ?? {}), false);

    const missingProfile = await request(`${url}/api/candidates/me`, { headers: authHeaders(noProfileCandidate.token) });
    assert.equal(missingProfile.status, 404);

    const updatedProfile = await request(
      `${url}/api/candidates/me`,
      jsonRequest('PUT', {
        name: 'Updated Candidate',
        email: `${testPrefix}updated@example.com`,
        phone: '+1 555 0100',
        resumeUrl: 'https://example.com/resume.pdf',
        timezone: 'America/New_York',
        userId: candidateB.userId,
        role: 'ta_admin',
      }, candidateA.token),
    );
    assert.equal(updatedProfile.status, 200);
    assert.equal(updatedProfile.body.data?.candidate?.name, 'Updated Candidate');
    assert.equal(updatedProfile.body.data?.candidate?.timezone, 'America/New_York');
    assert.equal(updatedProfile.body.data?.candidate?.userId, undefined);

    const duplicateEmail = await request(
      `${url}/api/candidates/me`,
      jsonRequest('PUT', { email: `${testPrefix}b@example.com` }, candidateA.token),
    );
    assert.equal(duplicateEmail.status, 409);

    const baseStart = new Date(Date.now() + 60 * 60 * 1000);
    const baseEnd = new Date(baseStart.getTime() + 60 * 60 * 1000);
    const createResponse = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(baseStart.toISOString(), baseEnd.toISOString(), { candidateId: candidateB.candidateId }), candidateA.token),
    );
    assert.equal(createResponse.status, 201);
    const slotId = createResponse.body.data?.availability?.id as string;
    assert(slotId);

    const listed = await request(`${url}/api/candidates/me/availability`, { headers: authHeaders(candidateA.token) });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.availability?.length, 1);
    assert.equal(listed.body.data?.availability?.[0]?.id, slotId);

    const duplicate = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(baseStart.toISOString(), baseEnd.toISOString()), candidateA.token),
    );
    assert.equal(duplicate.status, 409);

    const overlap = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(new Date(baseStart.getTime() + 30 * 60 * 1000).toISOString(), new Date(baseEnd.getTime() + 30 * 60 * 1000).toISOString()), candidateA.token),
    );
    assert.equal(overlap.status, 409);

    const adjacentStart = baseEnd;
    const adjacentEnd = new Date(adjacentStart.getTime() + 60 * 60 * 1000);
    const adjacent = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(adjacentStart.toISOString(), adjacentEnd.toISOString()), candidateA.token),
    );
    assert.equal(adjacent.status, 201);

    const invalid = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot('not-a-date', baseEnd.toISOString()), candidateA.token),
    );
    assert.equal(invalid.status, 400);
    const backwards = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(baseEnd.toISOString(), baseStart.toISOString()), candidateA.token),
    );
    assert.equal(backwards.status, 400);
    const pastEnd = new Date(Date.now() - 60 * 1000);
    const past = await request(
      `${url}/api/candidates/me/availability`,
      jsonRequest('POST', slot(new Date(pastEnd.getTime() - 60 * 60 * 1000).toISOString(), pastEnd.toISOString()), candidateA.token),
    );
    assert.equal(past.status, 400);

    const updatedSlotStart = new Date(adjacentEnd.getTime() + 60 * 60 * 1000);
    const updatedSlotEnd = new Date(updatedSlotStart.getTime() + 60 * 60 * 1000);
    const updatedSlot = await request(
      `${url}/api/candidates/me/availability/${slotId}`,
      jsonRequest('PUT', slot(updatedSlotStart.toISOString(), updatedSlotEnd.toISOString()), candidateA.token),
    );
    assert.equal(updatedSlot.status, 200);
    assert.equal(updatedSlot.body.data?.availability?.id, slotId);

    assert.equal((await request(`${url}/api/candidates/me/availability/${slotId}`, jsonRequest('PUT', slot(updatedSlotStart.toISOString(), updatedSlotEnd.toISOString()), candidateB.token))).status, 404);
    assert.equal((await request(`${url}/api/candidates/me/availability/${slotId}`, { method: 'DELETE', headers: authHeaders(candidateB.token) })).status, 404);
    assert.equal((await request(`${url}/api/candidates/me/availability/${slotId}`, { method: 'DELETE', headers: authHeaders(candidateA.token) })).status, 200);

    const auditEvents = await prisma.auditLog.findMany({
      where: { actorUserId: candidateA.userId, entityType: { in: ['Candidate', 'AvailabilitySlot'] } },
    });
    assert.deepEqual(
      new Set(auditEvents.map((event) => event.action)),
      new Set(['CANDIDATE_PROFILE_UPDATED', 'CANDIDATE_AVAILABILITY_CREATED', 'CANDIDATE_AVAILABILITY_UPDATED', 'CANDIDATE_AVAILABILITY_DELETED']),
    );
  } finally {
    await closeServer(server);
  }
});

after(async () => {
  const users = await prisma.user.findMany({ where: { email: { startsWith: testPrefix } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.availabilitySlot.deleteMany({ where: { candidate: { userId: { in: userIds } } } });
  await prisma.candidate.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});
