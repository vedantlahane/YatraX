import { z } from 'zod';

export const BroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  // "all" | "tourist:<uuid>" | "zone:<id>"
  target: z.string().default('all'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

export type BroadcastInput = z.infer<typeof BroadcastSchema>;
