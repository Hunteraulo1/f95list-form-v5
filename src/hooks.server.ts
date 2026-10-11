import { RequestContext } from '@mikro-orm/core';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { orm } from '#lib/server/db/index.ts';
import { handleApiKey } from '#lib/server/hooks/api-key.ts';
import { handleAuth } from '#lib/server/hooks/auth.ts';
import { handleLogging } from '#lib/server/hooks/logging.ts';
import { handleRateLimit } from '#lib/server/hooks/rate-limit.ts';
import { handleSecurityHeaders } from '#lib/server/hooks/security-headers.ts';
import { handleTheme } from '#lib/server/hooks/theme.ts';
import { logger } from '#lib/server/logger.ts';

const handleDbContext: Handle = ({ event, resolve }) =>
  RequestContext.create(orm.em, () => resolve(event));

export const handle = sequence(
  handleDbContext,
  handleRateLimit,
  handleAuth,
  handleTheme,
  handleLogging,
  handleSecurityHeaders,
  //? En dernier pour que ses réponses 401/429 passent aussi par le logging et les en-têtes de sécurité.
  handleApiKey,
);

//? SvelteKit 3 passe aussi par ici les erreurs voulues (`error(…)`), les 404 et les validations :
//? elles gardent leur statut et leur message. Seules les erreurs inattendues sont journalisées et masquées.
export const handleError: HandleServerError = ({ error, event, kind }) => {
  if (kind !== 'unknown') return;

  logger.error({ err: error, path: event.url.pathname }, 'unhandled error');

  return { message: 'Internal Error' };
};
