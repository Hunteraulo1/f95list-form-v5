import { error } from '@sveltejs/kit';
import { isLegalDocumentId, LEGAL_DOCUMENTS } from '#lib/legal-documents.ts';
import { parseMarkdownDocument } from '#lib/markdown/content.ts';
import { logger } from '#lib/server/logger.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  if (!isLegalDocumentId(params.document)) error(404, 'Not found');
  const { title, url } = LEGAL_DOCUMENTS[params.document];

  let markdown: string;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/markdown, text/plain, */*' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Le CDN a répondu ${response.status}.`);

    markdown = (await response.text()).trim();
    if (!markdown) throw new Error('Document vide.');
  } catch (cause) {
    logger.warn(
      { err: cause, document: params.document },
      'document légal illisible',
    );
    error(
      503,
      'Ce document est temporairement indisponible : réessayez plus tard.',
    );
  }

  //? Le texte change rarement : cinq minutes de cache évitent un appel au CDN par visite.
  setHeaders({ 'cache-control': 'public, max-age=300' });

  return { title, document: parseMarkdownDocument(markdown) };
};
