import { pino } from 'pino';
import { env} from '../config/env.js';
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'gateway' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.Node_Env === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});