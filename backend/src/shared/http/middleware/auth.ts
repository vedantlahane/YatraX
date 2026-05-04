import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors.js';

export interface AuthClaims {
  sub: string;
  role: 'tourist' | 'admin';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing bearer token'));
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthClaims;
    req.user = decoded;
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 'Invalid or expired token'));
  }
}

export function requireRole(role: AuthClaims['role']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('UNAUTHORIZED', 'Not authenticated'));
    if (req.user.role !== role) return next(new AppError('FORBIDDEN', 'Insufficient role'));
    next();
  };
}