import { z } from 'zod';

export const HospitalNearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0).max(200).optional().default(50),
});

export const CreateHospitalSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contact: z.string().min(3).max(200),
  type: z.enum(['hospital', 'clinic', 'emergency_center', 'maternity', 'community_center']).default('hospital'),
  tier: z.string().optional(),
  emergency: z.boolean().default(false),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  specialties: z.array(z.string().min(1)).optional(),
  bedCapacity: z.number().int().min(0).default(0),
  availableBeds: z.number().int().min(0).default(0),
  operatingHours: z
    .object({
      open: z.string().optional(),
      close: z.string().optional(),
      is24Hours: z.boolean().optional(),
    })
    .optional(),
  ambulanceAvailable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const UpdateHospitalSchema = CreateHospitalSchema.partial();

export const HospitalIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type HospitalNearbyQuery = z.infer<typeof HospitalNearbyQuerySchema>;
export type CreateHospitalInput = z.infer<typeof CreateHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof UpdateHospitalSchema>;
export type HospitalIdParam = z.infer<typeof HospitalIdParamSchema>;
