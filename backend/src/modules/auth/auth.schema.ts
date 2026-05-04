import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(5).max(20),
  passportNumber: z.string().min(3).max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const PasswordResetRequestSchema = z.object({
  email: z.string().email().toLowerCase(),
});
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmSchema>;