import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { getInternalServiceConfig, InternalServiceClient, InternalServiceError } from '../../services/internal-service-client.js';

const applicationInclude = { candidate: true, job: true, pipelineStages: { orderBy: { stageOrder: 'asc' } } } satisfies Prisma.ApplicationInclude;
export type ApplicationView = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

export async function applyToJob(jobId: string, candidateUserId: string, resumeUrl?: string): Promise<ApplicationView> {
  const [candidate, job] = await Promise.all([
    prisma.candidate.findUnique({ where: { userId: candidateUserId } }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);
  if (!candidate) throw new AppError(404, 'CANDIDATE_NOT_FOUND', 'Candidate profile not found');
  if (!job) throw new AppError(404, 'JOB_NOT_FOUND', 'Job not found');
  if (job.status !== 'open') throw new AppError(409, 'JOB_NOT_OPEN', 'Applications are only accepted for open jobs');
  try {
    return await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId: candidate.id, jobId, resumeUrl, status: 'submitted', screeningStatus: 'pending',
          pipelineStages: { create: { roundType: 'screening', stageOrder: 1, status: 'pending' } },
        }, include: applicationInclude,
      });
      await tx.auditLog.create({ data: { actorUserId: candidateUserId, action: 'APPLICATION_CREATED', entityType: 'Application', entityId: application.id, metadata: { jobId } } });
      return application;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'APPLICATION_ALREADY_EXISTS', 'You have already applied to this job');
    throw error;
  }
}

export async function getApplication(applicationId: string, actor: { id: string; role: string }): Promise<ApplicationView> {
  const application = await prisma.application.findUnique({ where: { id: applicationId }, include: applicationInclude });
  if (!application) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  if (actor.role !== 'ta_admin' && application.candidate.userId !== actor.id) throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this application');
  return application;
}

export async function listApplications(actor: { id: string; role: string }): Promise<ApplicationView[]> {
  if (actor.role === 'ta_admin') return prisma.application.findMany({ include: applicationInclude, orderBy: { appliedAt: 'desc' } });
  if (actor.role !== 'candidate') throw new AppError(403, 'FORBIDDEN', 'You do not have permission to list applications');
  return prisma.application.findMany({ where: { candidate: { userId: actor.id } }, include: applicationInclude, orderBy: { appliedAt: 'desc' } });
}

export async function screenApplication(applicationId: string, actor: { id: string; role: string }, pdf: Buffer, filename: string): Promise<ApplicationView> {
  const application = await getApplication(applicationId, actor);
  if (pdf.length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'Resume PDF is required');
  try {
    const config = getInternalServiceConfig('resume');
    const form = new FormData();
    form.append('candidate_id', application.candidateId);
    form.append('job_id', application.jobId);
    form.append('job_description', application.job.description ?? application.job.title);
    form.append('required_skills', application.job.requiredSkills.join(','));
    form.append('resume', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), filename);
    const response = await new InternalServiceClient('resume', config).request('/screen', { method: 'POST', body: form }, config.timeouts.screeningMs);
    const result = await response.json() as { final_score?: number; skill_score?: number; tfidf_score?: number; matched_skills?: string[]; missing_skills?: string[]; decision?: string; explanation?: string };
    if (typeof result.final_score !== 'number' || !result.decision) throw new AppError(502, 'RESUME_SERVICE_INVALID_RESPONSE', 'Screening service returned an invalid response');
    await prisma.$transaction(async (tx) => {
      await tx.application.update({ where: { id: applicationId }, data: { resumeUrl: filename, resumeScore: result.final_score, screeningStatus: result.decision === 'pass' ? 'passed' : 'failed', status: result.decision === 'pass' ? 'shortlisted' : 'rejected' } });
      await tx.modelRun.create({ data: { modelType: 'resume_screening', modelVersion: 'python-v1', inputReferenceId: applicationId, inputData: { filename, requiredSkills: application.job.requiredSkills }, outputData: result as Prisma.InputJsonValue, status: 'completed', completedAt: new Date(), applicationId } });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'APPLICATION_SCREENED', entityType: 'Application', entityId: applicationId, metadata: { score: result.final_score, decision: result.decision } } });
    });
  } catch (error) {
    if (error instanceof InternalServiceError) throw new AppError(502, 'RESUME_SERVICE_UNAVAILABLE', 'Screening service is unavailable');
    throw error;
  }
  return getApplication(applicationId, actor);
}
