import { z } from 'zod';

const emailSchema = z.string().trim().email().transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(8).max(128);
const nameSchema = z.string().trim().min(1).max(100);

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['candidate', 'interviewer']),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
