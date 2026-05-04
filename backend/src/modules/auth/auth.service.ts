//backend/src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../../shared/config/env.js';
import { AppError } from '../../shared/http/errors.js';
import type { Tourist, NewTourist } from '../../shared/db/schema.ts';
import { authRepo } from './auth.repo.js';
import type {
  RegisterInput,
  LoginInput,
  PasswordResetConfirmInput,
} from './auth.schema.ts';

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

function issueToken(touristId: string): string {
  return jwt.sign({ sub: touristId, role: 'tourist' as const }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as SignOptions['expiresIn'],
  });
}

function buildIdHash(passport: string, phone: string): string {
  return sha256(`${passport}${phone}${new Date().toISOString()}`);
}

function toPublic(t: Tourist) {
  const { passwordHash, resetTokenHash, resetTokenExpires, ...rest } = t;
  return rest;
}

/** Strip undefined values so we don't violate exactOptionalPropertyTypes. */
function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await authRepo.findByEmail(input.email);
    if (existing) throw new AppError('CONFLICT', 'Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const idHash = buildIdHash(input.passportNumber, input.phone);
    const idExpiry = new Date();
    idExpiry.setFullYear(idExpiry.getFullYear() + 1);

    const insert: NewTourist = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passportNumber: input.passportNumber,
      passwordHash,
      idHash,
      idExpiry,
      lastSeen: new Date(),
      ...defined({
        dateOfBirth: input.dateOfBirth,
        address: input.address,
        gender: input.gender,
        nationality: input.nationality,
        emergencyContact: input.emergencyContact,
        bloodType: input.bloodType,
        allergies: input.allergies,
        medicalConditions: input.medicalConditions,
      }),
    };

    const tourist = await authRepo.create(insert);

    return {
      token: issueToken(tourist.id),
      user: toPublic(tourist),
      qrContent: `/api/admin/id/verify?hash=${tourist.idHash}`,
    };
  },

  async login(input: LoginInput) {
    const tourist = await authRepo.findByEmail(input.email);
    if (!tourist) throw new AppError('UNAUTHORIZED', 'Invalid email or password');

    const ok = await bcrypt.compare(input.password, tourist.passwordHash);
    if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid email or password');

    return {
      token: issueToken(tourist.id),
      user: toPublic(tourist),
      qrContent: `/api/admin/id/verify?hash=${tourist.idHash}`,
    };
  },

  async me(touristId: string) {
    const tourist = await authRepo.findById(touristId);
    if (!tourist) throw new AppError('NOT_FOUND', 'Tourist not found');
    return toPublic(tourist);
  },

  async requestPasswordReset(email: string) {
    const tourist = await authRepo.findByEmail(email);
    // Do not leak whether the email exists.
    if (!tourist) return { acknowledged: true };

    const token = randomBytes(20).toString('hex');
    const resetTokenHash = sha256(token);
    const resetTokenExpires = new Date(Date.now() + 30 * 60_000); // 30 min

    await authRepo.updateById(tourist.id, { resetTokenHash, resetTokenExpires });

    // School-project mode: return token directly. In production, email it.
    return { acknowledged: true, resetToken: token };
  },

  async confirmPasswordReset(input: PasswordResetConfirmInput) {
    const hash = sha256(input.token);
    const tourist = await authRepo.findByResetTokenHash(hash);
    if (
      !tourist ||
      !tourist.resetTokenExpires ||
      tourist.resetTokenExpires.getTime() < Date.now()
    ) {
      throw new AppError('BAD_REQUEST', 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await authRepo.updateById(tourist.id, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpires: null,
    });

    return { acknowledged: true };
  },
};