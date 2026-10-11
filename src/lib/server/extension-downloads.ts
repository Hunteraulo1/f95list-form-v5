import type { ExtensionDownloadUrls } from '#lib/extension-browser.ts';
import { logger } from '#lib/server/logger.ts';

const RELEASE_PAGE =
  'https://github.com/Hunteraulo1/f95list-ext/releases/latest';
const RELEASE_API =
  'https://api.github.com/repos/Hunteraulo1/f95list-ext/releases/latest';

//? Sans réponse de GitHub, tous les liens mènent à la page de la dernière version.
const FALLBACK: ExtensionDownloadUrls = {
  page: RELEASE_PAGE,
  firefox: RELEASE_PAGE,
  chromium: RELEASE_PAGE,
};

//? GitHub limite les appels sans jeton (60 par heure et par adresse) : le résultat est gardé une
//? heure, et un échec dix minutes, pour ne pas le redemander à chaque visite de l'accueil.
const CACHE_MS = 60 * 60 * 1000;
const FAILURE_CACHE_MS = 10 * 60 * 1000;
let cached: { urls: ExtensionDownloadUrls; until: number } | null = null;

//? Liens directs vers les fichiers de la dernière version de l'extension (`…_firefox.xpi` et
//? `…_chrome.zip`).
export const getExtensionDownloadUrls =
  async (): Promise<ExtensionDownloadUrls> => {
    if (cached && cached.until > Date.now()) return cached.urls;

    try {
      const response = await fetch(RELEASE_API, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'f95list-form',
        },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`GitHub a répondu ${response.status}.`);

      const { assets = [] } = (await response.json()) as {
        assets?: { name?: string; browser_download_url?: string }[];
      };
      const find = (keyword: string) =>
        assets.find(({ name }) => name?.toLowerCase().includes(keyword))
          ?.browser_download_url ?? RELEASE_PAGE;

      cached = {
        urls: {
          page: RELEASE_PAGE,
          firefox: find('firefox'),
          chromium: find('chrome'),
        },
        until: Date.now() + CACHE_MS,
      };
    } catch (cause) {
      logger.warn({ err: cause }, "liens de l'extension indisponibles");
      cached = { urls: FALLBACK, until: Date.now() + FAILURE_CACHE_MS };
    }

    return cached.urls;
  };
