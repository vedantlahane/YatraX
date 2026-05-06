import { z } from 'zod';

export const NotifIdParamSchema = z.object({
  notifId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export const MarkReadSchema = z.object({}).optional();

export type NotifIdParam = z.infer<typeof NotifIdParamSchema>;
