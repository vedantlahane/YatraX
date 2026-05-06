//backend/src/server.ts

import { createServer } from 'node:http';
import { buildApp } from './app.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger/index.js';
import { wsHub } from './shared/ws/hub.js';
import { startCronJobs } from './shared/jobs/cron.js';

const app = buildApp();
const server = createServer(app);
wsHub.attach(server);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '🚀 yatrax gateway listening');
  startCronJobs();
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));