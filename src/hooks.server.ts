import type { HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handleLogging } from '$lib/server/hooks/logging';
import { handleRateLimit } from '$lib/server/hooks/rate-limit';
import { handleSecurityHeaders } from '$lib/server/hooks/security-headers';
import { logger } from '$lib/server/logger';

export const handle = sequence(
  handleRateLimit,
  handleLogging,
  handleSecurityHeaders,
);

export const handleError: HandleServerError = ({ error, event }) => {
  logger.error({ err: error, path: event.url.pathname }, 'unhandled error');

  return { message: 'Internal Error' };
};
