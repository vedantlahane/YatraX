import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../shared/config/env.js';
import { AppError } from '../../shared/http/errors.js';
import { policeRepo } from './police.repo.js';
import type {
  PoliceLoginInput,
  CreatePoliceInput,
  UpdatePoliceInput,
} from './police.schema.ts';
import type { PoliceDepartment, NewPoliceDepartment } from '../../shared/db/schema.js';

function toPublic(p: PoliceDepartment) {
  const { passwordHash, geom, ...rest } = p;
  return rest;
}

function issueAdminToken(adminId: string): string {
  return jwt.sign(
    { sub: adminId, role: 'admin' as const },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY } as unknown as SignOptions,
  );
}

export const policeService = {
  async login(input: PoliceLoginInput) {
    const dept = await policeRepo.findByEmail(input.email);
    if (!dept) throw new AppError('UNAUTHORIZED', 'Invalid credentials');
    if (!dept.isActive) throw new AppError('FORBIDDEN', 'Department is inactive');

    const ok = await bcrypt.compare(input.password, dept.passwordHash);
    if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid credentials');

    return {
      token: issueAdminToken(dept.id),
      admin: toPublic(dept),
    };
  },

  async list(search?: string) {
    const items = await policeRepo.listAll(search);
    return items.map(toPublic);
  },

  async getById(id: string) {
    const dept = await policeRepo.findById(id);
    if (!dept) throw new AppError('NOT_FOUND', 'Police department not found');
    return toPublic(dept);
  },

  async create(input: CreatePoliceInput) {
    const existing = await policeRepo.findByEmail(input.email);
    if (existing) throw new AppError('CONFLICT', 'Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const insert = {
      name: input.name,
      email: input.email,
      passwordHash,
      departmentCode: input.departmentCode,
      latitude: input.latitude,
      longitude: input.longitude,
      city: input.city,
      district: input.district,
      state: input.state,
      contactNumber: input.contactNumber,
      stationType: input.stationType,
      jurisdictionRadiusKm: input.jurisdictionRadiusKm,
      officerCount: input.officerCount,
      isActive: input.isActive,
    };
    const created = await policeRepo.create(insert);
    return toPublic(created);
  },

  async update(id: string, input: UpdatePoliceInput) {
    if (input.email) {
      const existing = await policeRepo.findByEmail(input.email);
      if (existing && existing.id !== id) throw new AppError('CONFLICT', 'Email already in use');
    }

    const patch: Partial<NewPoliceDepartment> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.email !== undefined) patch.email = input.email;
    if (input.departmentCode !== undefined) patch.departmentCode = input.departmentCode;
    if (input.latitude !== undefined) patch.latitude = input.latitude;
    if (input.longitude !== undefined) patch.longitude = input.longitude;
    if (input.city !== undefined) patch.city = input.city;
    if (input.district !== undefined) patch.district = input.district;
    if (input.state !== undefined) patch.state = input.state;
    if (input.contactNumber !== undefined) patch.contactNumber = input.contactNumber;
    if (input.stationType !== undefined) patch.stationType = input.stationType;
    if (input.jurisdictionRadiusKm !== undefined) patch.jurisdictionRadiusKm = input.jurisdictionRadiusKm;
    if (input.officerCount !== undefined) patch.officerCount = input.officerCount;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (input.password) patch.passwordHash = await bcrypt.hash(input.password, 12);

    const updated = await policeRepo.update(id, patch);
    if (!updated) throw new AppError('NOT_FOUND', 'Police department not found');
    return toPublic(updated);
  },

  async remove(id: string) {
    const ok = await policeRepo.remove(id);
    if (!ok) throw new AppError('NOT_FOUND', 'Police department not found');
    return { acknowledged: true };
  },
};
