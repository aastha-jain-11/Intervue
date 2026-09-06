import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { applyToJob, getApplication, listApplications, screenApplication } from './applications.service.js';
import { applicationIdSchema } from './applications.validation.js';

function auth(request: Parameters<RequestHandler>[0]): NonNullable<typeof request.auth> {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  return request.auth;
}
function id(value: unknown): string {
  const result = applicationIdSchema.safeParse(value);
  if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Application ID is invalid');
  return result.data;
}
export const apply: RequestHandler = async (request, response, next) => {
  try { const user = auth(request); const application = await applyToJob(String(request.params.jobId), user.id, request.body.resumeUrl); response.status(201).json({ success: true, data: { application } }); } catch (error) { next(error); }
};
export const get: RequestHandler = async (request, response, next) => {
  try { const application = await getApplication(id(request.params.applicationId), auth(request)); response.json({ success: true, data: { application } }); } catch (error) { next(error); }
};
export const list: RequestHandler = async (request, response, next) => {
  try { const applications = await listApplications(auth(request)); response.json({ success: true, data: { applications, count: applications.length } }); } catch (error) { next(error); }
};
export const screen: RequestHandler = async (request, response, next) => {
  try {
    if (!Buffer.isBuffer(request.body)) throw new AppError(400, 'VALIDATION_ERROR', 'Resume must be sent as application/pdf');
    const application = await screenApplication(id(request.params.applicationId), auth(request), request.body, request.header('x-resume-filename') ?? 'resume.pdf');
    response.json({ success: true, data: { application } });
  } catch (error) { next(error); }
};
