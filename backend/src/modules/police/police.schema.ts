import { z } from 'zod';

export const PoliceLoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type PoliceLoginInput = z.infer<typeof PoliceLoginSchema>;

export const CreatePoliceSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  departmentCode: z.string().min(1).max(50),

  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  city: z.string().min(1),
  district: z.string().min(1),
  state: z.string().min(1),
  contactNumber: z.string().min(5).max(30),

  stationType: z.enum(['outpost', 'station', 'district_hq']).default('station'),
  jurisdictionRadiusKm: z.number().int().min(0).max(500).default(10),
  officerCount: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreatePoliceInput = z.infer<typeof CreatePoliceSchema>;

export const UpdatePoliceSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().toLowerCase().optional(),
    password: z.string().min(8).optional(),
    departmentCode: z.string().min(1).max(50).optional(),

    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),

    city: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    contactNumber: z.string().min(5).max(30).optional(),

    stationType: z.enum(['outpost', 'station', 'district_hq']).optional(),
    jurisdictionRadiusKm: z.number().int().min(0).max(500).optional(),
    officerCount: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpdatePoliceInput = z.infer<typeof UpdatePoliceSchema>;

export const PoliceIdParamSchema = z.object({
  id: z.string().uuid(),
});
export type PoliceIdParam = z.infer<typeof PoliceIdParamSchema>;
