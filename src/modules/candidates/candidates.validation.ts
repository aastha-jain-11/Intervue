import { z } from 'zod';

const emailSchema = z.string().trim().email().transform((email) => email.toLowerCase());
const nameSchema = z.string().trim().min(1).max(100);
const phoneSchema = z.string().trim().min(3).max(30);
const resumeUrlSchema = z.string().trim().url().max(2048);
const timezoneSchema = z.string().trim().min(1).max(100).refine(isValidTimezone, 'Timezone is invalid');
const timestampSchema = z.coerce.date();

export const updateCandidateSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    resumeUrl: resumeUrlSchema.nullable().optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((candidate) => Object.keys(candidate).length > 0, 'At least one profile field is required');

export const availabilitySchema = z
  .object({
    startUtc: timestampSchema,
    endUtc: timestampSchema,
  })
  .superRefine((slot, context) => {
    if (slot.startUtc >= slot.endUtc) {
      context.addIssue({ code: 'custom', path: ['endUtc'], message: 'endUtc must be after startUtc' });
    }

    if (slot.endUtc <= new Date()) {
      context.addIssue({ code: 'custom', path: ['endUtc'], message: 'Availability must not have already ended' });
    }
  });

export const slotIdSchema = z.string().uuid();

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
