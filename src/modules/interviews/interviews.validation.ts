import { z } from 'zod';

export const interviewIdSchema = z.string().uuid();
export const createInterviewSchema = z.object({ roundType: z.enum(['screening', 'technical', 'managerial', 'HR']), durationMins: z.number().int().min(15).max(480), pipelineStageId: z.string().uuid().optional() });
export const updateInterviewSchema = z.object({ durationMins: z.number().int().min(15).max(480).optional(), status: z.enum(['pending', 'interviewer_requested', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show']).optional() }).refine((value) => Object.keys(value).length > 0);
export const scheduleInterviewSchema = z.object({ interviewerId: z.string().uuid(), selectedSlot: z.string().datetime() });
export const proposalSchema = scheduleInterviewSchema;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;
