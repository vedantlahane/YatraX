//backend/src/shared/cache/redis.ts

import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../logger/index.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (e) => logger.error({ err: e }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));