import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/http/errors.js';
import type { Tourist, NewTourist } from '../../shared/db/schema.js';
import { touristRepo } from './tourist.repo.js';
import type { UpdateProfileInput, ChangePasswordInput } from './tourist.schema.js';

function toPublic(t: Tourist) {
  const { passwordHash, resetTokenHash, resetTokenExpires, ...rest } = t;
  return rest;
}

/** Strip undefined keys to satisfy `exactOptionalPropertyTypes`. */
function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

export const touristService = {
  async getProfile(touristId: string) {
    const t = await touristRepo.findById(touristId);
    if (!t) throw new AppError('NOT_FOUND', 'Tourist not found');
    return toPublic(t);
  },

  async updateProfile(touristId: string, input: UpdateProfileInput) {
    const t = await touristRepo.findById(touristId);
    if (!t) throw new AppError('NOT_FOUND', 'Tourist not found');

    const patch = defined({
      name: input.name,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      address: input.address,
      gender: input.gender,
      nationality: input.nationality,
      emergencyContact: input.emergencyContact,
      bloodType: input.bloodType,
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
    }) as Partial<NewTourist>;

    if (Object.keys(patch).length === 0) return toPublic(t);

    const updated = await touristRepo.updateById(touristId, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'Tourist not found');
    return toPublic(updated);
  },

  async changePassword(touristId: string, input: ChangePasswordInput) {
    const t = await touristRepo.findById(touristId);
    if (!t) throw new AppError('NOT_FOUND', 'Tourist not found');

    const ok = await bcrypt.compare(input.currentPassword, t.passwordHash);
    if (!ok) throw new AppError('UNAUTHORIZED', 'Current password is incorrect');

    if (await bcrypt.compare(input.newPassword, t.passwordHash)) {
      throw new AppError('BAD_REQUEST', 'New password must differ from current');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await touristRepo.updateById(touristId, { passwordHash });
    return { acknowledged: true };
  },

  async list(opts: { page: number; limit: number; search?: string | undefined }) {
    const { items, total } = await touristRepo.list(opts);
    return {
      items: items.map(toPublic),
      page: opts.page,
      limit: opts.limit,
      total,
      pages: Math.max(1, Math.ceil(total / opts.limit)),
    };
  },

  async getById(touristId: string) {
    const t = await touristRepo.findById(touristId);
    if (!t) throw new AppError('NOT_FOUND', 'Tourist not found');
    return toPublic(t);
  },
};
