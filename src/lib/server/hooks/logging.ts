import type { Handle } from '@sveltejs/kit';
import { logger } from '../logger';

export const handleLogging: Handle = async ({ event, resolve }) => {
  const start = performance.now();

  const response = await resolve(event);

  logger.info(
    {
      method: event.request.method,
      path: event.url.pathname,
      status: response.status,
      duration: Math.round(performance.now() - start),
    },
    'request',
  );

  return response;
};
