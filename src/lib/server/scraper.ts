import type { EditionStatus } from '#lib/games/game-form.ts';
import { envConfig } from '#lib/server/env/index.ts';

export interface ThreadPreview {
  name: string;
  description: string | null;
  image: string | null;
  version: string | null;
  status: EditionStatus | null;
  //? Identifiants F95Checker des tags du thread (voir `game_tags.f95_id`) : à mapper vers les tags
  //? locaux par l'appelant, le scraper n'a pas accès à la base.
  tagsF95: number[];
}

export type PreviewResult =
  | { ok: true; data: ThreadPreview }
  | { ok: false; reason: 'not_configured' | 'not_found' | 'unavailable' };

interface RawPreviewResponse {
  editionStatus: EditionStatus | null;
  thread: {
    name: string;
    description: string;
    imageUrl: string | null;
    version: string | null;
    tags: number[];
  };
}

//? Aperçu d'un thread F95zone pas encore en base, via `GET /threads/:id` du scraper : rien n'est
//? écrit nulle part, ça sert juste à pré-remplir l'étape « Infos jeu ». Confort, pas critique : toute
//? erreur se traduit par `ok: false`, jamais par une exception qui bloquerait le formulaire.
export const previewThread = async (
  threadId: number,
): Promise<PreviewResult> => {
  if (!envConfig.SCRAPER_URL || !envConfig.SCRAPER_AUTH_TOKEN) {
    return { ok: false, reason: 'not_configured' };
  }

  let response: Response;
  try {
    response = await fetch(`${envConfig.SCRAPER_URL}/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${envConfig.SCRAPER_AUTH_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  if (response.status === 404) return { ok: false, reason: 'not_found' };
  if (!response.ok) return { ok: false, reason: 'unavailable' };

  const body = (await response.json()) as RawPreviewResponse;

  return {
    ok: true,
    data: {
      name: body.thread.name,
      description:
        body.thread.description === '' ? null : body.thread.description,
      image: body.thread.imageUrl,
      version: body.thread.version,
      status: body.editionStatus,
      tagsF95: body.thread.tags,
    },
  };
};

//? Ce que l'actualisation d'un jeu a besoin de la donnée du thread (voir `Thread` dans passation-scraper.md).
export interface RefreshedThread {
  version: string | null;
  //? Identifiant F95 du statut, non converti (voir `F95_STATUSES` dans game-refresh.ts).
  status: number;
  tags: number[];
}

export type RefreshResult =
  | {
      ok: true;
      thread: RefreshedThread;
      //? Éditions en auto-check que le scraper a mises à jour lui-même.
      editions: number;
    }
  | {
      ok: false;
      reason: 'not_configured' | 'not_found' | 'unsupported' | 'unavailable';
    };

//? Actualise un jeu F95zone via `POST /games/:id/refresh` du scraper, qui écrit lui-même en base le
//? jeu (nom, description, image, développeur, note, avis, liens) et ses éditions en auto-check.
export const refreshGame = async (gameId: number): Promise<RefreshResult> => {
  if (!envConfig.SCRAPER_URL || !envConfig.SCRAPER_AUTH_TOKEN) {
    return { ok: false, reason: 'not_configured' };
  }

  let response: Response;
  try {
    response = await fetch(`${envConfig.SCRAPER_URL}/games/${gameId}/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${envConfig.SCRAPER_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      //? Actualisation demandée à la main : le nom suit aussi le thread.
      body: JSON.stringify({ updateName: true }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, reason: 'unavailable' };
  }

  if (response.status === 404) return { ok: false, reason: 'not_found' };
  if (response.status === 422) return { ok: false, reason: 'unsupported' };
  if (!response.ok) return { ok: false, reason: 'unavailable' };

  const body = (await response.json()) as {
    editions: number;
    thread: RefreshedThread;
  };

  return { ok: true, thread: body.thread, editions: body.editions };
};
