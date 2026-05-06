import { z } from 'zod';

export const SafetyCheckQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  hour: z.coerce.number().int().min(0).max(23).optional(),
  networkType: z.enum(['wifi', '4g', '3g', '2g', 'none']).optional(),
  weatherSeverity: z.coerce.number().min(0).max(100).optional(),
  aqi: z.coerce.number().min(0).max(500).optional(),
  batteryPct: z.coerce.number().min(0).max(100).optional(),
});
export type SafetyCheckQuery = z.infer<typeof SafetyCheckQuerySchema>;
