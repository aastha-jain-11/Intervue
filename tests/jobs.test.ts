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
const testPrefix = `jobs-test-${Date.now()}-`;

type JobResponse = {
  success: boolean;
  data?: { job?: Record<string, unknown>; jobs?: Record<string, unknown>[]; count?: number };
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

async function request(url: string, options: RequestInit = {}): Promise<{ status: number; body: JobResponse }> {
  const response = await fetch(url, options);
  return { status: response.status, body: (await response.json()) as JobResponse };
}

function jsonRequest(method: string, body: unknown, token?: string): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  };
}

test('Jobs API enforces RBAC, validates input, filters jobs, and records audit events', async () => {
  const [candidate, interviewer, ta] = await Promise.all([
    prisma.user.create({ data: { name: 'Jobs Candidate', email: `${testPrefix}candidate@example.com`, passwordHash: 'not-used', role: 'candidate', timezone: 'UTC' } }),
    prisma.user.create({ data: { name: 'Jobs Interviewer', email: `${testPrefix}interviewer@example.com`, passwordHash: 'not-used', role: 'interviewer', timezone: 'UTC' } }),
    prisma.user.create({ data: { name: 'Jobs TA', email: `${testPrefix}ta@example.com`, passwordHash: 'not-used', role: 'ta_admin', timezone: 'UTC' } }),
  ]);
  const candidateToken = createApplicationToken(candidate.id, candidate.role);
  const interviewerToken = createApplicationToken(interviewer.id, interviewer.role);
  const taToken = createApplicationToken(ta.id, ta.role);
  const { server, url } = await startTestServer();

  try {
    const unauthenticated = await request(`${url}/api/jobs`, jsonRequest('POST', { title: 'Unauthorized' }));
    assert.equal(unauthenticated.status, 401);

    for (const token of [candidateToken, interviewerToken]) {
      const forbidden = await request(`${url}/api/jobs`, jsonRequest('POST', { title: 'Forbidden' }, token));
      assert.equal(forbidden.status, 403);
    }

    const created = await request(`${url}/api/jobs`, jsonRequest('POST', {
      title: 'Backend Engineer',
      description: 'Build backend systems',
      department: 'Engineering',
      location: 'Remote',
      experienceMin: 2,
      experienceMax: 5,
      requiredSkills: ['TypeScript', 'PostgreSQL'],
      createdById: candidate.id,
    }, taToken));
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.job?.createdBy && (created.body.data.job.createdBy as { id: string }).id, ta.id);
    assert.equal('passwordHash' in (created.body.data?.job ?? {}), false);
    const jobId = created.body.data?.job?.id as string;
    assert(jobId);

    assert.equal((await request(`${url}/api/jobs`, { headers: { authorization: `Bearer ${candidateToken}` } })).status, 200);
    const filtered = await request(`${url}/api/jobs?status=draft`, { headers: { authorization: `Bearer ${candidateToken}` } });
    assert.equal(filtered.status, 200);
    assert.equal(filtered.body.data?.jobs?.some((job) => job.id === jobId), true);
    const searched = await request(`${url}/api/jobs?search=backend`, { headers: { authorization: `Bearer ${candidateToken}` } });
    assert.equal(searched.body.data?.jobs?.some((job) => job.id === jobId), true);

    const single = await request(`${url}/api/jobs/${jobId}`, { headers: { authorization: `Bearer ${candidateToken}` } });
    assert.equal(single.status, 200);
    assert.equal((await request(`${url}/api/jobs/00000000-0000-0000-0000-000000000000`, { headers: { authorization: `Bearer ${candidateToken}` } })).status, 404);

    assert.equal((await request(`${url}/api/jobs/${jobId}`, jsonRequest('PUT', { title: 'Nope' }, candidateToken))).status, 403);
    const updated = await request(`${url}/api/jobs/${jobId}`, jsonRequest('PUT', { title: 'Senior Backend Engineer' }, taToken));
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.job?.title, 'Senior Backend Engineer');

    const statusChanged = await request(`${url}/api/jobs/${jobId}/status`, jsonRequest('PATCH', { status: 'open' }, taToken));
    assert.equal(statusChanged.status, 200);
    assert.equal(statusChanged.body.data?.job?.status, 'open');
    assert.equal((await request(`${url}/api/jobs/${jobId}/status`, jsonRequest('PATCH', { status: 'invalid' }, taToken))).status, 400);
    assert.equal((await request(`${url}/api/jobs/${jobId}/status`, jsonRequest('PATCH', { status: 'closed' }, candidateToken))).status, 403);

    const auditEvents = await prisma.auditLog.findMany({ where: { entityType: 'Job', entityId: jobId } });
    assert.deepEqual(new Set(auditEvents.map((event) => event.action)), new Set(['JOB_CREATED', 'JOB_UPDATED', 'JOB_STATUS_CHANGED']));
  } finally {
    await closeServer(server);
  }
});

after(async () => {
  await prisma.auditLog.deleteMany({ where: { actor: { email: { startsWith: testPrefix } } } });
  await prisma.job.deleteMany({ where: { createdBy: { email: { startsWith: testPrefix } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: testPrefix } } });
  await prisma.$disconnect();
});
