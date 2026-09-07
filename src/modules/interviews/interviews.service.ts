import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';
import { getInternalServiceConfig, InternalServiceClient, InternalServiceError } from '../../services/internal-service-client.js';
import type { CreateInterviewInput, ScheduleInterviewInput, UpdateInterviewInput } from './interviews.validation.js';

const interviewInclude = { application: { include: { candidate: true, job: true } }, pipelineStage: true, selectedInterviewer: true, matches: { orderBy: { rank: 'asc' } }, slotRecommendations: { orderBy: { rank: 'asc' } } } satisfies Prisma.InterviewInclude;
type InterviewView = Prisma.InterviewGetPayload<{ include: typeof interviewInclude }>;
const getInterview = async (id: string): Promise<InterviewView> => { const interview = await prisma.interview.findUnique({ where: { id }, include: interviewInclude }); if (!interview) throw new AppError(404, 'INTERVIEW_NOT_FOUND', 'Interview not found'); return interview; };

export async function listInterviewsForActor(actor: { id: string; role: string }): Promise<InterviewView[]> {
  const where: Prisma.InterviewWhereInput = actor.role === 'ta_admin'
    ? {}
    : actor.role === 'candidate'
      ? { application: { candidate: { userId: actor.id } } }
      : { selectedInterviewer: { userId: actor.id } };
  return prisma.interview.findMany({ where, include: interviewInclude, orderBy: { createdAt: 'desc' } });
}

export async function getInterviewForActor(id: string, actor: { id: string; role: string }): Promise<InterviewView> {
  const interview = await getInterview(id);
  if (actor.role !== 'ta_admin' && interview.application.candidate.userId !== actor.id && interview.selectedInterviewer?.userId !== actor.id) throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this interview');
  return interview;
}

export async function createInterview(applicationId: string, input: CreateInterviewInput, actorUserId: string): Promise<InterviewView> {
  const application = await prisma.application.findUnique({ where: { id: applicationId }, include: { pipelineStages: true } });
  if (!application) throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
  const stage = input.pipelineStageId ? application.pipelineStages.find((item) => item.id === input.pipelineStageId) : application.pipelineStages.find((item) => item.roundType === input.roundType && !item.scheduledInterviewId);
  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.create({ data: { applicationId, pipelineStageId: stage?.id, roundType: input.roundType, durationMins: input.durationMins, status: 'pending' }, include: interviewInclude });
    if (stage) await tx.pipelineStage.update({ where: { id: stage.id }, data: { scheduledInterviewId: interview.id, status: 'in_progress' } });
    await tx.auditLog.create({ data: { actorUserId, action: 'INTERVIEW_CREATED', entityType: 'Interview', entityId: interview.id, metadata: { applicationId, roundType: input.roundType } } });
    return interview;
  });
}

export async function updateInterview(id: string, input: UpdateInterviewInput, actorUserId: string): Promise<InterviewView> {
  await getInterview(id);
  return prisma.$transaction(async (tx) => { const interview = await tx.interview.update({ where: { id }, data: input, include: interviewInclude }); await tx.auditLog.create({ data: { actorUserId, action: 'INTERVIEW_UPDATED', entityType: 'Interview', entityId: id, metadata: { fields: Object.keys(input) } } }); return interview; });
}

export async function recommendInterviewers(id: string, actorUserId: string): Promise<InterviewView> {
  const interview = await getInterview(id);
  const interviewers = await prisma.interviewer.findMany({ where: { isAvailable: true }, select: { id: true, name: true, email: true, experienceYears: true, skills: true } });
  const skills = interview.application.job.requiredSkills;
  try {
    const config = getInternalServiceConfig('resume');
    const response = await new InternalServiceClient('resume', config).request('/recommend-interviewers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidate_id: interview.application.candidateId, skills, interviewers: interviewers.map((item) => ({ interviewer_id: item.id, name: item.name, email: item.email, experience: item.experienceYears, skills: item.skills })) }) }, config.timeouts.computeMs);
    const data = await response.json() as { recommended_interviewers?: Array<{ interviewer_id: string; match_score: number; matched_skills?: string[]; missing_skills?: string[] }> };
    const results = data.recommended_interviewers ?? [];
    await prisma.$transaction(async (tx) => { await tx.interviewerMatch.deleteMany({ where: { interviewId: id } }); await tx.interviewerMatch.createMany({ data: results.filter((item) => interviewers.some((interviewer) => interviewer.id === item.interviewer_id)).map((item, index) => ({ interviewId: id, interviewerId: item.interviewer_id, matchScore: item.match_score, skillMatchScore: item.match_score, rank: index + 1, reason: `Matched skills: ${(item.matched_skills ?? []).join(', ')}`, modelVersion: 'python-v1' })) }); await tx.modelRun.create({ data: { modelType: 'interviewer_matching', modelVersion: 'python-v1', inputReferenceId: id, inputData: { skills }, outputData: { recommendations: results }, status: 'completed', completedAt: new Date(), applicationId: interview.applicationId } }); await tx.auditLog.create({ data: { actorUserId, action: 'INTERVIEW_RECOMMENDATIONS_CREATED', entityType: 'Interview', entityId: id, metadata: { count: results.length } } }); });
  } catch (error) { if (error instanceof InternalServiceError) throw new AppError(502, 'RESUME_SERVICE_UNAVAILABLE', 'Recommendation service is unavailable'); throw error; }
  return getInterview(id);
}

export async function scheduleInterview(id: string, input: ScheduleInterviewInput, actorUserId: string): Promise<InterviewView> {
  const interview = await getInterview(id); const slot = new Date(input.selectedSlot); const end = new Date(slot.getTime() + interview.durationMins * 60_000);
  const interviewer = await prisma.interviewer.findUnique({ where: { id: input.interviewerId } }); if (!interviewer || !interviewer.isAvailable) throw new AppError(400, 'INTERVIEWER_NOT_AVAILABLE', 'Interviewer is not available');
  const [candidateSlot, interviewerSlot, calendarConflict, interviewerInterviews] = await Promise.all([
    prisma.availabilitySlot.findFirst({ where: { candidateId: interview.application.candidateId, ownerType: 'candidate', status: 'available', startUtc: { lte: slot }, endUtc: { gte: end } } }),
    prisma.availabilitySlot.findFirst({ where: { interviewerId: interviewer.id, ownerType: 'interviewer', status: 'available', startUtc: { lte: slot }, endUtc: { gte: end } } }),
    prisma.calendarEvent.findFirst({ where: { OR: [{ candidateId: interview.application.candidateId }, { interviewerId: interviewer.id }], slot: { gte: new Date(slot.getTime() - 24 * 60 * 60 * 1000), lte: end } } }),
    prisma.interview.findMany({ where: { id: { not: id }, selectedSlot: { not: null }, status: 'scheduled', OR: [{ selectedInterviewerId: interviewer.id }, { application: { candidateId: interview.application.candidateId } }] } }),
  ]);
  const overlap = interviewerInterviews.some((item) => { const start = item.selectedSlot as Date; const finish = new Date(start.getTime() + item.durationMins * 60_000); return start < end && finish > slot; });
  if (!candidateSlot || !interviewerSlot || calendarConflict || overlap) throw new AppError(409, 'SCHEDULING_CONFLICT', 'Selected slot is no longer available');
  const meetLink = `https://meet.intervue.local/${id}`;
  const scheduled = await prisma.$transaction(async (tx) => { const updated = await tx.interview.update({ where: { id }, data: { selectedInterviewerId: interviewer.id, selectedSlot: slot, meetLink, status: 'scheduled' }, include: interviewInclude }); await tx.calendarEvent.create({ data: { interviewId: id, interviewerId: interviewer.id, candidateId: interview.application.candidateId, slot, meetLink, status: 'created' } }); await tx.auditLog.create({ data: { actorUserId, action: 'INTERVIEW_SCHEDULED', entityType: 'Interview', entityId: id, metadata: { interviewerId: interviewer.id, selectedSlot: slot.toISOString() } } }); return updated; });
  await notifyScheduled(scheduled);
  return scheduled;
}

export async function autoScheduleInterview(id: string, actorUserId: string): Promise<{ interview: InterviewView; matchScore: number; candidateAvailable: true; interviewerAvailable: true; calendarEventCreated: true; notificationSent: boolean }> {
  await recommendInterviewers(id, actorUserId);
  const interview = await getInterview(id);
  const [candidateSlots, interviewerSlots] = await Promise.all([
    prisma.availabilitySlot.findMany({ where: { candidateId: interview.application.candidateId, ownerType: 'candidate', status: 'available' }, orderBy: { startUtc: 'asc' } }),
    prisma.availabilitySlot.findMany({ where: { ownerType: 'interviewer', status: 'available', interviewer: { isAvailable: true } }, include: { interviewer: true }, orderBy: { startUtc: 'asc' } }),
  ]);
  const matches = await prisma.interviewerMatch.findMany({ where: { interviewId: id }, orderBy: { rank: 'asc' } });
  const matchByInterviewer = new Map(matches.map((match) => [match.interviewerId, Number(match.matchScore ?? 0)]));
  const options: Array<{ interviewerId: string; slot: Date; score: number }> = [];
  for (const interviewerSlot of interviewerSlots) {
    if (!interviewerSlot.interviewerId || !matchByInterviewer.has(interviewerSlot.interviewerId)) continue;
    for (const candidateSlot of candidateSlots) {
      const start = new Date(Math.max(candidateSlot.startUtc.getTime(), interviewerSlot.startUtc.getTime()));
      const end = new Date(Math.min(candidateSlot.endUtc.getTime(), interviewerSlot.endUtc.getTime()));
      for (let slot = start; slot.getTime() + interview.durationMins * 60_000 <= end.getTime(); slot = new Date(slot.getTime() + 30 * 60_000)) {
        options.push({ interviewerId: interviewerSlot.interviewerId, slot, score: matchByInterviewer.get(interviewerSlot.interviewerId) ?? 0 });
      }
    }
  }
  options.sort((left, right) => right.score - left.score || left.slot.getTime() - right.slot.getTime());
  if (options.length === 0) throw new AppError(409, 'NO_FEASIBLE_SLOT', 'No compatible candidate and interviewer slot is available');
  await prisma.$transaction(async (tx) => {
    await tx.slotRecommendation.deleteMany({ where: { interviewId: id } });
    await tx.slotRecommendation.createMany({ data: options.slice(0, 20).map((option, index) => ({ interviewId: id, slot: option.slot, priorityScore: option.score, rank: index + 1, reason: `Interviewer ${option.interviewerId}; skill match ${option.score}`, modelVersion: 'node-mvp-v1' })) });
    await tx.auditLog.create({ data: { actorUserId, action: 'INTERVIEW_SLOT_RECOMMENDATIONS_CREATED', entityType: 'Interview', entityId: id, metadata: { count: Math.min(options.length, 20) } } });
  });
  let scheduled: InterviewView | undefined;
  let selected: { interviewerId: string; slot: Date; score: number } | undefined;
  for (const option of options) {
    try { scheduled = await scheduleInterview(id, { interviewerId: option.interviewerId, selectedSlot: option.slot.toISOString() }, actorUserId); selected = option; break; } catch (error) { if (!(error instanceof AppError) || error.code !== 'SCHEDULING_CONFLICT') throw error; }
  }
  if (!scheduled || !selected) throw new AppError(409, 'SCHEDULING_CONFLICT', 'No recommended slot remained available');
  const notification = await prisma.notificationLog.findFirst({ where: { interviewId: id, type: 'INTERVIEW_SCHEDULED' }, orderBy: { timestamp: 'desc' } });
  return { interview: scheduled, matchScore: selected.score, candidateAvailable: true, interviewerAvailable: true, calendarEventCreated: true, notificationSent: notification?.status === 'sent' };
}

async function notifyScheduled(interview: InterviewView): Promise<void> {
  try { const config = getInternalServiceConfig('notification'); await new InternalServiceClient('notification', config).request('/notifications/interview-scheduled', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ interview_id: interview.id, candidate: interview.application.candidate, interviewer: interview.selectedInterviewer, round_type: interview.roundType, duration_mins: interview.durationMins, selected_slot: { start: interview.selectedSlot?.toISOString(), end: new Date((interview.selectedSlot as Date).getTime() + interview.durationMins * 60_000).toISOString() }, mode: 'online', timezone: interview.application.candidate.timezone, meet_link: interview.meetLink }) }, config.timeouts.dispatchMs); await prisma.notificationLog.create({ data: { interviewId: interview.id, recipientType: 'interview', recipientId: interview.id, channel: 'email', type: 'INTERVIEW_SCHEDULED', status: 'sent' } }); } catch { await prisma.notificationLog.create({ data: { interviewId: interview.id, recipientType: 'interview', recipientId: interview.id, channel: 'email', type: 'INTERVIEW_SCHEDULED', status: 'failed' } }); }
}
