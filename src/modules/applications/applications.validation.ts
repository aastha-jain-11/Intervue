import { z } from 'zod';

export const applicationIdSchema = z.string().uuid();
export const applySchema = z.object({ resumeUrl: z.string().url().optional() });
export type ApplyInput = z.infer<typeof applySchema>;
