import { z } from 'zod';

const titleSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().max(10000);
const optionalTextSchema = z.string().trim().min(1).max(200);
const experienceSchema = z.number().int().min(0).max(100);
const skillsSchema = z.array(z.string().trim().min(1).max(100)).max(100);
const statusSchema = z.enum(['draft', 'open', 'closed']);

const jobFields = {
  title: titleSchema,
  description: descriptionSchema.optional(),
  department: optionalTextSchema.optional(),
  location: optionalTextSchema.optional(),
  experienceMin: experienceSchema.optional(),
  experienceMax: experienceSchema.optional(),
  requiredSkills: skillsSchema,
  status: statusSchema.optional(),
};

export const createJobSchema = z.object(jobFields).superRefine(validateExperienceRange);

export const updateJobSchema = z
  .object(jobFields)
  .partial()
  .refine((job) => Object.keys(job).length > 0, 'At least one mutable field is required')
  .superRefine(validateExperienceRange);

export const updateJobStatusSchema = z.object({ status: statusSchema });

export const jobIdSchema = z.string().uuid();

export const jobQuerySchema = z.object({
  status: statusSchema.optional(),
  department: z.string().trim().min(1).max(200).optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type JobQuery = z.infer<typeof jobQuerySchema>;

function validateExperienceRange(
  job: { experienceMin?: number; experienceMax?: number },
  context: z.RefinementCtx,
): void {
  if (job.experienceMin !== undefined && job.experienceMax !== undefined && job.experienceMin > job.experienceMax) {
    context.addIssue({
      code: 'custom',
      path: ['experienceMin'],
      message: 'experienceMin must not exceed experienceMax',
    });
  }
}
