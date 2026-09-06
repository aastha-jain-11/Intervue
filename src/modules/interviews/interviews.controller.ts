import type { RequestHandler } from 'express';
import { AppError } from '../../middleware/error.middleware.js';
import { autoScheduleInterview, createInterview, getInterviewForActor, recommendInterviewers, scheduleInterview, updateInterview } from './interviews.service.js';
import { interviewIdSchema } from './interviews.validation.js';
import type { CreateInterviewInput, ScheduleInterviewInput, UpdateInterviewInput } from './interviews.validation.js';

function auth(request: Parameters<RequestHandler>[0]): NonNullable<typeof request.auth> { if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required'); return request.auth; }
function interviewId(value: unknown): string { const result = interviewIdSchema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Interview ID is invalid'); return result.data; }
export const create: RequestHandler = async (request, response, next) => { try { const user = auth(request); const interview = await createInterview(String(request.params.applicationId), request.body as CreateInterviewInput, user.id); response.status(201).json({ success: true, data: { interview } }); } catch (error) { next(error); } };
export const get: RequestHandler = async (request, response, next) => { try { const interview = await getInterviewForActor(interviewId(request.params.interviewId), auth(request)); response.json({ success: true, data: { interview } }); } catch (error) { next(error); } };
export const update: RequestHandler = async (request, response, next) => { try { const user = auth(request); const interview = await updateInterview(interviewId(request.params.interviewId), request.body as UpdateInterviewInput, user.id); response.json({ success: true, data: { interview } }); } catch (error) { next(error); } };
export const recommendations: RequestHandler = async (request, response, next) => { try { const user = auth(request); const interview = await recommendInterviewers(interviewId(request.params.interviewId), user.id); response.json({ success: true, data: { interview, recommendations: interview.matches } }); } catch (error) { next(error); } };
export const schedule: RequestHandler = async (request, response, next) => { try { const user = auth(request); const interview = await scheduleInterview(interviewId(request.params.interviewId), request.body as ScheduleInterviewInput, user.id); response.json({ success: true, data: { interview } }); } catch (error) { next(error); } };
export const autoSchedule: RequestHandler = async (request, response, next) => { try { const result = await autoScheduleInterview(interviewId(request.params.interviewId), auth(request).id); response.json({ success: true, data: result }); } catch (error) { next(error); } };
