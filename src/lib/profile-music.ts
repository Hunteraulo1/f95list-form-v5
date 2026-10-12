//? Musique d'un profil : un lien YouTube ou YouTube Music, dont on ne garde que l'identifiant de la
//? vidéo. Partagé entre le serveur (validation, adresse enregistrée) et le lecteur du profil.
const VIDEO_ID = /^[\w-]{11}$/;

const HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
]);

const videoId = (candidate: string | null | undefined) => {
  const id = (candidate ?? '').trim();

  return VIDEO_ID.test(id) ? id : null;
};

//? L'identifiant de la vidéo d'un lien YouTube (watch, youtu.be, embed, shorts), ou `null`.
export const extractYoutubeVideoId = (
  raw: string | null | undefined,
): string | null => {
  const text = (raw ?? '').trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return videoId(url.pathname.split('/')[1]);
    if (!HOSTS.has(host)) return null;

    return (
      videoId(url.searchParams.get('v')) ??
      videoId(url.pathname.match(/^\/(?:embed|shorts|watch)\/([\w-]{11})/)?.[1])
    );
  } catch {
    return null;
  }
};

//? L'adresse enregistrée en base : toujours la même forme, quel que soit le lien collé.
export const youtubeWatchUrl = (id: string) =>
  `https://www.youtube.com/watch?v=${id}`;

//? Origine du lecteur embarqué (sans cookie) : la seule que la CSP autorise en `frame-src`.
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

//? Le lecteur est piloté par messages (`postMessage`) : aucun script de YouTube n'est chargé sur la page.
export const YOUTUBE_WIDGET_ID = 1;

export const youtubeEmbedUrl = (id: string, pageOrigin: string) =>
  `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?${new URLSearchParams({
    enablejsapi: '1',
    widgetid: String(YOUTUBE_WIDGET_ID),
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    rel: '0',
    playsinline: '1',
    origin: pageOrigin,
  })}`;
