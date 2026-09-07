import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type User, type UserRole, type InterviewerType, type ApplicationStatus, type ApplicationScreeningStatus, type PipelineStageStatus, type RoundType, type InterviewStatus } from '@prisma/client';

const prisma = new PrismaClient();
const password = process.env.DEMO_PASSWORD ?? 'IntervueDemo123!';
const demo = { ta: process.env.DEMO_TA_EMAIL ?? 'demo-ta@intervue.local', candidate: process.env.DEMO_CANDIDATE_EMAIL ?? 'demo-candidate@intervue.local', interviewer: process.env.DEMO_INTERVIEWER_EMAIL ?? 'demo-interviewer@intervue.local' };
const at = (day: number, hour: number) => new Date(Date.UTC(2099, 0, day, hour));

type CandidateSeed = [string, string, string, string];
type InterviewerSeed = [string, string, string, InterviewerType, number, string[], string];

async function user(email: string, name: string, role: UserRole, hash: string, timezone = 'UTC'): Promise<User> {
  const found = await prisma.user.findUnique({ where: { email } });
  if (found) {
    if (found.role !== role) throw new Error(`Seed email ${email} belongs to a different role.`);
    return found; // Never changes existing demo account passwords or details.
  }
  return prisma.user.create({ data: { email, name, role, passwordHash: hash, timezone } });
}
async function candidate(u: User, [email, name, phone, timezone]: CandidateSeed) {
  return prisma.candidate.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, email, name, phone, timezone } });
}
async function interviewer(u: User, [email, name, jobRole, interviewerType, experienceYears, skills, timezone]: InterviewerSeed) {
  return prisma.interviewer.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, email, name, jobRole, interviewerType, experienceYears, skills, timezone, workingHours: { weekdays: '09:00-17:00' } } });
}
async function job(title: string, owner: User, description: string, skills: string[], status: 'open' | 'closed', location = 'Remote') {
  const found = await prisma.job.findFirst({ where: { title, createdById: owner.id } });
  return found ?? prisma.job.create({ data: { title, createdById: owner.id, description, department: 'Engineering', location, experienceMin: 3, experienceMax: 9, requiredSkills: skills, status } });
}
async function application(candidateId: string, jobId: string, status: ApplicationStatus, screeningStatus: ApplicationScreeningStatus) {
  return prisma.application.upsert({ where: { candidateId_jobId: { candidateId, jobId } }, update: {}, create: { candidateId, jobId, status, screeningStatus, resumeUrl: `https://demo.intervue.local/resumes/${candidateId}.pdf` } });
}
async function stage(applicationId: string, roundType: RoundType, stageOrder: number, status: PipelineStageStatus, decidedById?: string, feedbackNotes?: string) {
  const found = await prisma.pipelineStage.findFirst({ where: { applicationId, stageOrder } });
  const data = { status, decidedById, decidedAt: decidedById ? at(2, 12) : null, feedbackNotes };
  return found ? prisma.pipelineStage.update({ where: { id: found.id }, data }) : prisma.pipelineStage.create({ data: { applicationId, roundType, stageOrder, ...data } });
}
async function interview(applicationId: string, pipelineStageId: string, status: InterviewStatus, interviewerId?: string, slot?: Date, meetLink?: string) {
  const found = await prisma.interview.findUnique({ where: { pipelineStageId } });
  const data = { applicationId, pipelineStageId, roundType: 'technical' as const, durationMins: 60, status, selectedInterviewerId: interviewerId, selectedSlot: slot, meetLink };
  return found ? prisma.interview.update({ where: { id: found.id }, data }) : prisma.interview.create({ data });
}
async function availability(ownerType: 'candidate' | 'interviewer', candidateId: string | undefined, interviewerId: string | undefined, interviewId: string | undefined, startUtc: Date, endUtc: Date, status: 'available' | 'selected' = 'available') {
  const found = await prisma.availabilitySlot.findFirst({ where: { ownerType, candidateId, interviewerId, interviewId, startUtc, endUtc } });
  return found ?? prisma.availabilitySlot.create({ data: { ownerType, candidateId, interviewerId, interviewId, startUtc, endUtc, status } });
}
async function participant(interviewId: string, interviewerId: string) {
  return prisma.interviewParticipant.upsert({ where: { interviewId_interviewerId: { interviewId, interviewerId } }, update: {}, create: { interviewId, interviewerId, participantRole: 'primary' } });
}
async function match(interviewId: string, interviewerId: string, rank: number, score: number, reason: string) {
  const found = await prisma.interviewerMatch.findFirst({ where: { interviewId, interviewerId, rank } });
  return found ?? prisma.interviewerMatch.create({ data: { interviewId, interviewerId, rank, matchScore: score, skillMatchScore: score, experienceMatchScore: score, roleMatchScore: score, reason, modelVersion: 'demo-v1' } });
}
async function recommendation(interviewId: string, slot: Date, score: number) {
  const found = await prisma.slotRecommendation.findFirst({ where: { interviewId, slot, rank: 1 } });
  return found ?? prisma.slotRecommendation.create({ data: { interviewId, slot, rank: 1, priorityScore: score, workingHoursScore: score, candidatePreferenceScore: score, reason: 'Best common availability slot.', modelVersion: 'demo-v1' } });
}
async function request(interviewId: string, interviewerId: string, slot: Date, status: 'pending' | 'accepted') {
  const found = await prisma.interviewRequest.findFirst({ where: { interviewId, interviewerId, slot } });
  return found ?? prisma.interviewRequest.create({ data: { interviewId, interviewerId, slot, status, expiresAt: at(30, 0), respondedAt: status === 'accepted' ? at(2, 13) : undefined } });
}
async function calendar(interviewId: string, interviewerId: string, candidateId: string, slot: Date, externalEventId: string) {
  const found = await prisma.calendarEvent.findFirst({ where: { externalEventId } });
  return found ?? prisma.calendarEvent.create({ data: { interviewId, interviewerId, candidateId, slot, externalEventId, meetLink: `https://meet.intervue.local/${externalEventId}` } });
}
async function notification(interviewId: string, recipientType: string, recipientId: string, type: string, message: string, status: 'sent' | 'delivered') {
  const found = await prisma.notificationLog.findFirst({ where: { interviewId, recipientType, recipientId, type } });
  return found ?? prisma.notificationLog.create({ data: { interviewId, recipientType, recipientId, channel: 'in_app', type, message, status, timestamp: at(3, 8), readAt: status === 'delivered' ? at(3, 9) : undefined } });
}
async function model(applicationId: string, modelType: 'resume_screening' | 'interviewer_matching' | 'slot_recommendation', inputReferenceId: string, outputData: object) {
  const found = await prisma.modelRun.findFirst({ where: { modelType, inputReferenceId } });
  return found ?? prisma.modelRun.create({ data: { applicationId, modelType, modelVersion: 'demo-v1', inputReferenceId, inputData: { seeded: true }, outputData, status: 'completed', completedAt: at(3, 7) } });
}
async function audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata: object) {
  const found = await prisma.auditLog.findFirst({ where: { actorUserId, action, entityType, entityId } });
  return found ?? prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, metadata, createdAt: at(3, 8) } });
}

async function main() {
  if (password.length < 8) throw new Error('DEMO_PASSWORD must be at least 8 characters.');
  const hash = await bcrypt.hash(password, 12);

  // Users and profiles: 4 TA/admins, 12 candidates, 7 interviewers.
  const tas = await Promise.all([
    user(demo.ta, 'Demo TA Admin', 'ta_admin', hash), user('priya.shah.ta@intervue.local', 'Priya Shah', 'ta_admin', hash),
    user('marcus.lee.ta@intervue.local', 'Marcus Lee', 'ta_admin', hash), user('elena.ross.ta@intervue.local', 'Elena Ross', 'ta_admin', hash),
  ]);
  const cSeeds: CandidateSeed[] = [
    [demo.candidate, 'Demo Candidate', '+1-415-555-0100', 'UTC'], ['aisha.khan@intervue.local', 'Aisha Khan', '+1-415-555-0101', 'America/Los_Angeles'],
    ['ben.carter@intervue.local', 'Ben Carter', '+1-212-555-0102', 'America/New_York'], ['carla.gomez@intervue.local', 'Carla Gomez', '+1-512-555-0103', 'America/Chicago'],
    ['dev.patel@intervue.local', 'Dev Patel', '+91-22-5550-0104', 'Asia/Kolkata'], ['emily.chen@intervue.local', 'Emily Chen', '+1-206-555-0105', 'America/Los_Angeles'],
    ['farah.ali@intervue.local', 'Farah Ali', '+44-20-5550-0106', 'Europe/London'], ['gabriel.silva@intervue.local', 'Gabriel Silva', '+55-11-5550-0107', 'America/Sao_Paulo'],
    ['hana.kim@intervue.local', 'Hana Kim', '+82-2-5550-0108', 'Asia/Seoul'], ['isaac.miller@intervue.local', 'Isaac Miller', '+1-303-555-0109', 'America/Denver'],
    ['julia.martin@intervue.local', 'Julia Martin', '+33-1-5550-0110', 'Europe/Paris'], ['kevin.nguyen@intervue.local', 'Kevin Nguyen', '+1-617-555-0111', 'America/New_York'],
  ];
  const candidates = new Map<string, Awaited<ReturnType<typeof candidate>>>();
  for (const seed of cSeeds) candidates.set(seed[0], await candidate(await user(seed[0], seed[1], 'candidate', hash, seed[3]), seed));
  const iSeeds: InterviewerSeed[] = [
    [demo.interviewer, 'Demo Interviewer', 'Senior Software Engineer', 'technical', 5, ['TypeScript', 'Backend', 'System Design'], 'UTC'],
    ['sara.ahmed@intervue.local', 'Sara Ahmed', 'Staff Backend Engineer', 'technical', 9, ['Java', 'PostgreSQL', 'Distributed Systems'], 'America/New_York'],
    ['michael.owens@intervue.local', 'Michael Owens', 'Frontend Engineering Manager', 'technical', 11, ['React', 'TypeScript', 'Accessibility'], 'America/Los_Angeles'],
    ['nora.brown@intervue.local', 'Nora Brown', 'Security Architect', 'technical', 12, ['Application Security', 'Cloud Security', 'Threat Modeling'], 'America/Chicago'],
    ['arjun.mehta@intervue.local', 'Arjun Mehta', 'Machine Learning Lead', 'technical', 10, ['Python', 'Machine Learning', 'MLOps'], 'Asia/Kolkata'],
    ['lisa.wong@intervue.local', 'Lisa Wong', 'Engineering Director', 'managerial', 14, ['Leadership', 'System Design'], 'America/Los_Angeles'],
    ['tom.reed@intervue.local', 'Tom Reed', 'Technical Recruiter', 'screening', 7, ['Recruiting', 'Technical Screening'], 'America/New_York'],
  ];
  const interviewers = new Map<string, Awaited<ReturnType<typeof interviewer>>>();
  for (const seed of iSeeds) interviewers.set(seed[0], await interviewer(await user(seed[0], seed[1], 'interviewer', hash, seed[6]), seed));

  // Jobs and applications. The existing primary application is looked up by its stable composite key.
  const jobs = new Map<string, Awaited<ReturnType<typeof job>>>();
  for (const [title, owner, description, skills, status, location] of [
    ['Demo Software Engineer', tas[0], 'Controlled demo role for the Intervue scheduling workflow.', ['TypeScript', 'Backend', 'System Design'], 'open', 'Remote'],
    ['Backend Developer', tas[1], 'Build resilient APIs and distributed services.', ['Java', 'PostgreSQL', 'Distributed Systems'], 'open', 'New York / Hybrid'],
    ['Frontend Engineer', tas[2], 'Create accessible recruiter and candidate experiences.', ['React', 'TypeScript', 'Accessibility'], 'open', 'Remote - US'],
    ['Security Engineer', tas[0], 'Strengthen product and cloud security.', ['Application Security', 'Cloud Security', 'Threat Modeling'], 'open', 'Austin / Hybrid'],
    ['Data / ML Engineer', tas[3], 'Build dependable production ML infrastructure.', ['Python', 'Machine Learning', 'MLOps'], 'closed', 'Remote'],
  ] as const) jobs.set(title, await job(title, owner, description, [...skills], status, location));
  const app = (email: string, title: string, status: ApplicationStatus, screening: ApplicationScreeningStatus) => application(candidates.get(email)!.id, jobs.get(title)!.id, status, screening);
  const demoApp = await app(demo.candidate, 'Demo Software Engineer', 'shortlisted', 'passed');
  const aisha = await app('aisha.khan@intervue.local', 'Backend Developer', 'shortlisted', 'passed');
  const ben = await app('ben.carter@intervue.local', 'Frontend Engineer', 'interviewing', 'passed');
  const carla = await app('carla.gomez@intervue.local', 'Security Engineer', 'shortlisted', 'passed');
  const dev = await app('dev.patel@intervue.local', 'Data / ML Engineer', 'selected', 'passed');
  const emily = await app('emily.chen@intervue.local', 'Frontend Engineer', 'screening', 'processing');
  await app('farah.ali@intervue.local', 'Backend Developer', 'submitted', 'pending'); await app('gabriel.silva@intervue.local', 'Demo Software Engineer', 'shortlisted', 'passed');
  await app('hana.kim@intervue.local', 'Security Engineer', 'rejected', 'failed'); const isaac = await app('isaac.miller@intervue.local', 'Backend Developer', 'shortlisted', 'passed');
  const julia = await app('julia.martin@intervue.local', 'Data / ML Engineer', 'selected', 'passed'); const kevin = await app('kevin.nguyen@intervue.local', 'Frontend Engineer', 'interviewing', 'passed');

  // Stages and interviews.
  const complete = async (a: { id: string }, owner: User, note: string) => stage(a.id, 'screening', 1, 'completed', owner.id, note);
  await complete(demoApp, tas[0], 'Resume screening passed with an 88% match.'); const demoTech = await stage(demoApp.id, 'technical', 2, 'scheduled', tas[0].id, 'Technical interview confirmed.');
  const demoInterview = await interview(demoApp.id, demoTech.id, 'scheduled', interviewers.get(demo.interviewer)!.id, at(15, 10), 'https://meet.intervue.local/demo-technical');
  await complete(aisha, tas[1], 'Strong backend and database fundamentals.'); const aishaTech = await stage(aisha.id, 'technical', 2, 'scheduled', tas[1].id, 'System design interview scheduled.');
  const aishaInterview = await interview(aisha.id, aishaTech.id, 'scheduled', interviewers.get('sara.ahmed@intervue.local')!.id, at(16, 14), 'https://meet.intervue.local/backend-aisha');
  await complete(ben, tas[2], 'Portfolio review passed.'); const benTech = await stage(ben.id, 'technical', 2, 'in_progress', undefined, 'Awaiting interviewer acceptance.'); const benInterview = await interview(ben.id, benTech.id, 'interviewer_requested', interviewers.get('michael.owens@intervue.local')!.id, at(17, 17));
  await complete(carla, tas[0], 'Security screening passed.'); const carlaTech = await stage(carla.id, 'technical', 2, 'pending', undefined, 'Interviewer recommendation ready.'); const carlaInterview = await interview(carla.id, carlaTech.id, 'confirmed', interviewers.get('nora.brown@intervue.local')!.id);
  await complete(dev, tas[3], 'ML experience verified.'); const devTech = await stage(dev.id, 'technical', 2, 'completed', tas[3].id, 'Excellent MLOps discussion; move to offer.'); await interview(dev.id, devTech.id, 'completed', interviewers.get('arjun.mehta@intervue.local')!.id, at(8, 13));
  await stage(emily.id, 'screening', 1, 'in_progress'); await stage(isaac.id, 'screening', 1, 'completed', tas[1].id, 'Screening completed successfully.'); const isaacTech = await stage(isaac.id, 'technical', 2, 'pending'); await interview(isaac.id, isaacTech.id, 'pending');
  await complete(julia, tas[3], 'Screening completed.'); const juliaTech = await stage(julia.id, 'technical', 2, 'completed', tas[3].id, 'Selected after technical round.'); await interview(julia.id, juliaTech.id, 'completed', interviewers.get('arjun.mehta@intervue.local')!.id, at(6, 15));
  await complete(kevin, tas[2], 'Screening passed.'); const kevinTech = await stage(kevin.id, 'technical', 2, 'pending'); await interview(kevin.id, kevinTech.id, 'pending');

  // Overlapping, future availability slots.
  const c = (email: string) => candidates.get(email)!.id, i = (email: string) => interviewers.get(email)!.id;
  await Promise.all([
    availability('candidate', c(demo.candidate), undefined, demoInterview.id, at(15, 10), at(15, 11), 'selected'), availability('interviewer', undefined, i(demo.interviewer), demoInterview.id, at(15, 10), at(15, 11), 'selected'),
    availability('candidate', c(demo.candidate), undefined, undefined, at(16, 10), at(16, 12)), availability('interviewer', undefined, i(demo.interviewer), undefined, at(16, 10), at(16, 12)),
    availability('candidate', c('aisha.khan@intervue.local'), undefined, aishaInterview.id, at(16, 14), at(16, 15), 'selected'), availability('interviewer', undefined, i('sara.ahmed@intervue.local'), aishaInterview.id, at(16, 14), at(16, 15), 'selected'),
    availability('candidate', c('aisha.khan@intervue.local'), undefined, undefined, at(17, 14), at(17, 16)), availability('interviewer', undefined, i('sara.ahmed@intervue.local'), undefined, at(17, 14), at(17, 16)),
    availability('candidate', c('ben.carter@intervue.local'), undefined, benInterview.id, at(17, 17), at(17, 19)), availability('interviewer', undefined, i('michael.owens@intervue.local'), benInterview.id, at(17, 17), at(17, 19)),
    availability('candidate', c('carla.gomez@intervue.local'), undefined, carlaInterview.id, at(18, 15), at(18, 17)), availability('interviewer', undefined, i('nora.brown@intervue.local'), carlaInterview.id, at(18, 15), at(18, 17)),
    availability('candidate', c('isaac.miller@intervue.local'), undefined, undefined, at(19, 14), at(19, 16)), availability('candidate', c('kevin.nguyen@intervue.local'), undefined, undefined, at(20, 17), at(20, 19)),
    availability('interviewer', undefined, i('lisa.wong@intervue.local'), undefined, at(19, 14), at(19, 17)), availability('interviewer', undefined, i('tom.reed@intervue.local'), undefined, at(20, 15), at(20, 18)),
  ]);

  // Supporting workflow records.
  await participant(demoInterview.id, i(demo.interviewer)); await participant(aishaInterview.id, i('sara.ahmed@intervue.local')); await participant(benInterview.id, i('michael.owens@intervue.local'));
  await match(demoInterview.id, i(demo.interviewer), 1, .94, 'Strong TypeScript and system-design match.'); await match(benInterview.id, i('michael.owens@intervue.local'), 1, .91, 'React and accessibility expertise matches the role.'); await match(carlaInterview.id, i('nora.brown@intervue.local'), 1, .96, 'Security domain expertise is an excellent fit.');
  await recommendation(demoInterview.id, at(15, 10), .98); await recommendation(benInterview.id, at(17, 17), .93);
  await request(benInterview.id, i('michael.owens@intervue.local'), at(17, 17), 'pending'); await request(aishaInterview.id, i('sara.ahmed@intervue.local'), at(16, 14), 'accepted');
  await calendar(demoInterview.id, i(demo.interviewer), c(demo.candidate), at(15, 10), 'demo-technical-2099'); await calendar(aishaInterview.id, i('sara.ahmed@intervue.local'), c('aisha.khan@intervue.local'), at(16, 14), 'backend-aisha-2099');
  await notification(demoInterview.id, 'candidate', c(demo.candidate), 'interview_scheduled', 'Your technical interview is scheduled for 15 January 2099 at 10:00 UTC.', 'delivered');
  await notification(demoInterview.id, 'interviewer', i(demo.interviewer), 'interviewer_accepted', 'You accepted the Demo Candidate technical interview.', 'sent');
  await notification(benInterview.id, 'interviewer', i('michael.owens@intervue.local'), 'interviewer_proposal', 'A frontend interview proposal is awaiting your response.', 'delivered');
  await notification(carlaInterview.id, 'candidate', c('carla.gomez@intervue.local'), 'interviewer_recommended', 'A security interviewer has been recommended.', 'sent');
  await model(demoApp.id, 'resume_screening', `resume:${demoApp.id}`, { score: .88, outcome: 'passed' }); await model(ben.id, 'interviewer_matching', `match:${benInterview.id}`, { score: .91 }); await model(demoApp.id, 'slot_recommendation', `slot:${demoInterview.id}`, { slot: at(15, 10).toISOString(), score: .98 });
  for (const row of [[tas[0].id, 'application_created', 'Application', demoApp.id, { source: 'demo-seed' }], [tas[0].id, 'screening_completed', 'Application', demoApp.id, { result: 'passed' }], [tas[0].id, 'recommendation_generated', 'Interview', demoInterview.id, { model: 'slot_recommendation' }], [tas[0].id, 'interviewer_proposed', 'Interview', benInterview.id, { interviewerId: i('michael.owens@intervue.local') }], [i(demo.interviewer) === interviewers.get(demo.interviewer)!.id ? interviewers.get(demo.interviewer)!.userId : '', 'interviewer_accepted', 'Interview', demoInterview.id, { slot: at(15, 10).toISOString() }], [tas[0].id, 'interview_scheduled', 'Interview', demoInterview.id, { slot: at(15, 10).toISOString() }], [tas[0].id, 'notification_created', 'Notification', demoInterview.id, { type: 'interview_scheduled' }]] as const) await audit(...row);
  const counts = await Promise.all([prisma.user.count(), prisma.job.count(), prisma.application.count(), prisma.availabilitySlot.count(), prisma.interview.count(), prisma.calendarEvent.count(), prisma.notificationLog.count(), prisma.auditLog.count()]);
  console.info(`Demo seed completed. Totals: users=${counts[0]}, jobs=${counts[1]}, applications=${counts[2]}, availability=${counts[3]}, interviews=${counts[4]}, calendarEvents=${counts[5]}, notifications=${counts[6]}, audits=${counts[7]}.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Demo seed failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
