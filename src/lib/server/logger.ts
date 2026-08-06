import pino from 'pino';
import { envConfig } from './env';

export const logger = pino({ level: envConfig.LOG_LEVEL });
