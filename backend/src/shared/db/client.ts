import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const sql = postgres(env.DATABASE_URL, {
  max: 10,
  prepare: false, // Supabase pooler is in transaction mode → must be false
});

export const db = drizzle(sql, { schema, casing: 'snake_case' });
export type DB = typeof db;