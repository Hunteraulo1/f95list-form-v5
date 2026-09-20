import { RequestContext } from '@mikro-orm/core';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { orm } from '$lib/server/db';
import { handleApiKey } from '$lib/server/hooks/api-key';
import { handleAuth } from '$lib/server/hooks/auth';
import { handleLogging } from '$lib/server/hooks/logging';
import { handleRateLimit } from '$lib/server/hooks/rate-limit';
import { handleSecurityHeaders } from '$lib/server/hooks/security-headers';
import { logger } from '$lib/server/logger';

const handleDbContext: Handle = ({ event, resolve }) =>
  RequestContext.create(orm.em, () => resolve(event));

export const handle = sequence(
  handleDbContext,
  handleRateLimit,
  handleAuth,
  handleLogging,
  handleSecurityHeaders,
  //? En dernier pour que ses réponses 401/429 passent aussi par le logging et les en-têtes de sécurité.
  handleApiKey,
);

export const handleError: HandleServerError = ({ error, event }) => {
  logger.error({ err: error, path: event.url.pathname }, 'unhandled error');

  return { message: 'Internal Error' };
};
