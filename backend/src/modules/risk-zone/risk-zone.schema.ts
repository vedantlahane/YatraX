import { z } from 'zod';

const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const categories = [
  'flood',
  'wildlife',
  'crime',
  'traffic',
  'political_unrest',
  'other',
] as const;
const sources = ['admin', 'ml_pipeline', 'crowd_report'] as const;

const latLngTuple = z.tuple([
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
]);

export const CreateRiskZoneSchema = z.discriminatedUnion('shapeType', [
  z.object({
    shapeType: z.literal('circle'),
    centerLat: z.number().min(-90).max(90),
    centerLng: z.number().min(-180).max(180),
    radiusMeters: z.number().int().min(50).max(50_000),
    name: z.string().min(2).max(200),
    description: z.string().max(1000).optional(),
    riskLevel: z.enum(riskLevels).default('MEDIUM'),
    active: z.boolean().default(true),
    category: z.enum(categories).optional(),
    source: z.enum(sources).default('admin'),
    expiresAt: z.coerce.date().optional(),
  }),
  z.object({
    shapeType: z.literal('polygon'),
    polygonCoordinates: z.array(latLngTuple).min(3).max(100),
    name: z.string().min(2).max(200),
    description: z.string().max(1000).optional(),
    riskLevel: z.enum(riskLevels).default('MEDIUM'),
    active: z.boolean().default(true),
    category: z.enum(categories).optional(),
    source: z.enum(sources).default('admin'),
    expiresAt: z.coerce.date().optional(),
  }),
]);
export type CreateRiskZoneInput = z.infer<typeof CreateRiskZoneSchema>;

export const UpdateRiskZoneSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional(),
    riskLevel: z.enum(riskLevels).optional(),
    active: z.boolean().optional(),
    category: z.enum(categories).optional(),
    source: z.enum(sources).optional(),
    expiresAt: z.coerce.date().nullable().optional(),

    shapeType: z.enum(['circle', 'polygon']).optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().int().min(50).max(50_000).optional(),
    polygonCoordinates: z.array(latLngTuple).min(3).max(100).optional(),
  })
  .strict();
export type UpdateRiskZoneInput = z.infer<typeof UpdateRiskZoneSchema>;

export const ZoneIdParamSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
});
export type ZoneIdParam = z.infer<typeof ZoneIdParamSchema>;

export const ToggleStatusBodySchema = z.object({ active: z.boolean() });
export type ToggleStatusInput = z.infer<typeof ToggleStatusBodySchema>;

export const BulkStatusSchema = z.object({
  zoneIds: z.array(z.number().int().positive()).min(1).max(500),
  active: z.boolean(),
});
export type BulkStatusInput = z.infer<typeof BulkStatusSchema>;

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(200).default(10),
  riskLevel: z.enum(riskLevels).optional(),
});
export type NearbyQuery = z.infer<typeof NearbyQuerySchema>;
