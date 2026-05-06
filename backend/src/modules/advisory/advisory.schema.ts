import { z } from 'zod';

export const CreateAdvisorySchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('INFO'),
  affectedArea: z.string().max(500).optional(),
  source: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const UpdateAdvisorySchema = CreateAdvisorySchema.partial().extend({
  active: z.boolean().optional(),
});

export const AdvisoryIdParamSchema = z.object({
  id: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type CreateAdvisoryInput = z.infer<typeof CreateAdvisorySchema>;
export type UpdateAdvisoryInput = z.infer<typeof UpdateAdvisorySchema>;
