import { envConfig } from '$lib/server/env';
import { logger } from '$lib/server/logger';

//? LibreTranslate limite la taille des requêtes : découpage conservateur, comme en v4.
const MAX_CHUNK_CHARS = 4000;

interface LibreTranslateResponse {
  translatedText?: string;
  error?: string;
}

const resolveBaseUrl = () => {
  const raw = envConfig.LIBRETRANSLATE_URL?.trim();

  return raw ? raw.replace(/\/+$/, '').replace(/\/translate$/i, '') : null;
};

const splitText = (text: string, maxLen: number): string[] => {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let splitAt = rest.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen * 0.5) splitAt = rest.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.5) splitAt = rest.lastIndexOf(' ', maxLen);
    if (splitAt <= 0) splitAt = maxLen;

    chunks.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }
  if (rest) chunks.push(rest);

  return chunks.filter(Boolean);
};

const translateChunk = async (
  text: string,
  baseUrl: string,
): Promise<string> => {
  const body: Record<string, string> = {
    q: text,
    source: 'auto',
    target: 'fr',
    format: 'text',
  };
  if (envConfig.LIBRETRANSLATE_API_KEY) {
    body.api_key = envConfig.LIBRETRANSLATE_API_KEY;
  }

  const response = await fetch(`${baseUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const json = (await response
    .json()
    .catch(() => null)) as LibreTranslateResponse | null;

  if (!response.ok) {
    const detail = json?.error ?? '';
    throw new Error(
      `LibreTranslate a répondu ${response.status}${detail ? ` : ${detail.slice(0, 200)}` : ''}.`,
    );
  }

  const translated = json?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error('Réponse LibreTranslate invalide.');
  }

  return translated.trim();
};

//? Traduit un texte vers le français via LibreTranslate (https://docs.libretranslate.com/).
//? `null` si le service n'est pas configuré ou si la traduction échoue : la description française
//? reste alors vide plutôt que de bloquer la création du jeu.
export const translateToFrench = async (
  text: string,
): Promise<string | null> => {
  const trimmed = text.trim();
  const baseUrl = resolveBaseUrl();
  if (!trimmed || !baseUrl) return null;

  try {
    const parts: string[] = [];
    for (const chunk of splitText(trimmed, MAX_CHUNK_CHARS)) {
      parts.push(await translateChunk(chunk, baseUrl));
    }

    return parts.join('\n\n').trim() || null;
  } catch (cause) {
    logger.warn({ err: cause }, 'traduction LibreTranslate impossible');
    return null;
  }
};
