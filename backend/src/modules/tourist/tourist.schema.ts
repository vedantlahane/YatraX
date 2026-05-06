import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().min(5).max(20).optional(),
    dateOfBirth: z.string().optional(),
    address: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']).optional(),
    nationality: z.string().optional(),
    emergencyContact: z
      .object({
        name: z.string().optional(),
        phone: z.string().optional(),
        relationship: z.string().optional(),
      })
      .optional(),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    allergies: z.array(z.string()).optional(),
    medicalConditions: z.array(z.string()).optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const TouristIdParamSchema = z.object({
  touristId: z.string().uuid(),
});
export type TouristIdParam = z.infer<typeof TouristIdParamSchema>;

export const ListTouristsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().trim().min(1).optional(),
});
export type ListTouristsQuery = z.infer<typeof ListTouristsQuerySchema>;
