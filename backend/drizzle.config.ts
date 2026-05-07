import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// drizzle-kit (migrations) needs the DIRECT connection (port 5432), not the pooler.
// The app runtime uses DATABASE_URL (pooler, port 6543) for queries.
const migrationUrl = process.env['DATABASE_DIRECT_URL'] ?? process.env['DATABASE_URL']!;

export default defineConfig({
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: migrationUrl },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});