<script lang="ts">
import { Pause, Play, Volume2, VolumeX } from '@lucide/svelte';
import { onMount } from 'svelte';
import {
  YOUTUBE_EMBED_ORIGIN,
  YOUTUBE_WIDGET_ID,
  youtubeEmbedUrl,
} from '#lib/profile-music.ts';

interface Props {
  videoId: string;
}

const { videoId }: Props = $props();

//? Le volume choisi suit le visiteur d'un profil à l'autre.
const VOLUME_KEY = 'profile-music-volume';
const DEFAULT_VOLUME = 50;
const PLAYING = 1;

let frame = $state<HTMLIFrameElement | null>(null);
//? Le lecteur n'est chargé qu'au premier clic : rien ne part vers YouTube avant.
let src = $state<string | null>(null);
let ready = $state(false);
let playing = $state(false);
let wanted = $state(false);
let volume = $state(DEFAULT_VOLUME);
let lastVolume = $state(DEFAULT_VOLUME);

const post = (message: Record<string, unknown>) =>
  frame?.contentWindow?.postMessage(
    JSON.stringify(message),
    YOUTUBE_EMBED_ORIGIN,
  );
const command = (func: string, args: unknown = '') =>
  post({ event: 'command', func, args });

//? Le lecteur ne répond qu'une fois abonné, et ignore l'abonnement tant qu'il n'est pas prêt :
//? on insiste quelques fois.
const subscribe = () => {
  for (const delay of [0, 100, 300, 800, 1500]) {
    setTimeout(
      () =>
        post({ event: 'listening', id: YOUTUBE_WIDGET_ID, channel: 'widget' }),
      delay,
    );
  }
};

const applyVolume = () => {
  if (!ready) return;
  if (volume === 0) command('mute');
  else {
    command('unMute');
    command('setVolume', [volume]);
  }
};

const setVolume = (value: number) => {
  volume = Math.round(Math.max(0, Math.min(100, value)));
  if (volume > 0) lastVolume = volume;
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    //? Stockage indisponible (navigation privée) : le volume vaut pour cette page seulement.
  }
  applyVolume();
};

const onMessage = (event: MessageEvent) => {
  if (event.origin !== YOUTUBE_EMBED_ORIGIN) return;
  if (event.source !== frame?.contentWindow) return;

  let data: { event?: string; info?: number | { playerState?: number } | null };
  try {
    data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  } catch {
    return;
  }
  if (!data || typeof data !== 'object') return;

  const state =
    typeof data.info === 'number' ? data.info : data.info?.playerState;

  if (data.event === 'onReady' || state !== undefined) {
    if (!ready) {
      ready = true;
      applyVolume();
      if (wanted) command('playVideo');
    }
  }
  if (state !== undefined) playing = state === PLAYING;
};

const toggle = () => {
  if (playing || (wanted && !ready)) {
    wanted = false;
    playing = false;
    command('pauseVideo');
    return;
  }

  wanted = true;
  if (src === null) src = youtubeEmbedUrl(videoId, window.location.origin);
  else command('playVideo');
};

onMount(() => {
  try {
    const stored = Number.parseInt(localStorage.getItem(VOLUME_KEY) ?? '', 10);
    if (Number.isFinite(stored)) volume = Math.max(0, Math.min(100, stored));
  } catch {
    //? Voir `setVolume`.
  }
  if (volume > 0) lastVolume = volume;

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
});
</script>

<div class="relative flex items-center gap-2">
  {#if src}
    <!-- Invisible : seul le son compte, les commandes sont les nôtres. -->
    <iframe
      bind:this={frame}
      {src}
      title="Musique du profil (YouTube)"
      allow="autoplay"
      referrerpolicy="strict-origin-when-cross-origin"
      class="pointer-events-none absolute size-px opacity-0"
      tabindex="-1"
      aria-hidden="true"
      onload={subscribe}
    ></iframe>
  {/if}

  <button
    type="button"
    class="shadow-mini flex h-8 cursor-pointer items-center gap-2 rounded-xl border-2 border-base-content px-3 text-sm font-bold hover:border-primary hover:bg-primary hover:text-neutral-content"
    aria-pressed={playing}
    onclick={toggle}
  >
    {#if playing || (wanted && !ready)}
      <Pause size="16" />
      Pause
    {:else}
      <Play size="16" />
      Écouter
    {/if}
  </button>

  <button
    type="button"
    class="cursor-pointer rounded-lg p-1 hover:bg-base-300"
    aria-label={volume === 0 ? 'Réactiver le son' : 'Couper le son'}
    onclick={() => setVolume(volume === 0 ? lastVolume : 0)}
  >
    {#if volume === 0}
      <VolumeX size="18" />
    {:else}
      <Volume2 size="18" />
    {/if}
  </button>
  <input
    type="range"
    min="0"
    max="100"
    class="w-20 cursor-pointer accent-primary"
    aria-label="Volume de la musique"
    value={volume}
    oninput={(event) => setVolume(Number(event.currentTarget.value))}
  >
</div>
