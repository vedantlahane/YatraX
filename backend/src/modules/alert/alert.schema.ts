import { z } from 'zod';

export const TouristIdParamSchema = z.object({
  touristId: z.string().uuid(),
});
export type TouristIdParam = z.infer<typeof TouristIdParamSchema>;

export const AlertIdParamSchema = z.object({
  alertId: z.coerce.number().int().positive(),
});
export type AlertIdParam = z.infer<typeof AlertIdParamSchema>;

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  heading: z.number().min(0).max(360).optional(),
});
export type LocationUpdateInput = z.infer<typeof LocationUpdateSchema>;

export const SosSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  message: z.string().max(1000).optional(),
  media: z.array(z.string().url()).max(10).optional(),
});
export type SosInput = z.infer<typeof SosSchema>;

export const PreAlertSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type PreAlertInput = z.infer<typeof PreAlertSchema>;

export const UpdateStatusSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'CANCELLED']),
});
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

export const ListAlertsQuerySchema = z.object({
  status: z
    .enum(['OPEN', 'PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED', 'CANCELLED'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
export type ListAlertsQuery = z.infer<typeof ListAlertsQuerySchema>;
