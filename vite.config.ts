import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { IMAGE_HOSTS } from './src/lib/image-hosts.ts';
import { YOUTUBE_EMBED_ORIGIN } from './src/lib/profile-music.ts';
import { handleUpgrade } from './src/lib/server/ws/socket.ts';

const webSocketServer: Plugin = {
  name: 'integrated-websocket-server',
  configureServer(server) {
    server.httpServer?.on('upgrade', (request, socket, head) => {
      handleUpgrade(request, socket, head);
    });
  },
};

export default defineConfig(({ command }) => {
  const dev = command === 'serve';

  return {
    plugins: [
      sveltekit({
        preprocess: vitePreprocess(),

        compilerOptions: {
          //! Fix legacy svelte dependencies
          runes: ({ filename }: { filename: string }) =>
            filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
        },
        adapter: adapter(),

        csp: {
          mode: 'auto',
          directives: {
            'default-src': ['self'],
            'script-src': ['self', 'https://insight.f95france.site'],
            'style-src': ['self', 'https://fonts.googleapis.com'],
            'img-src': ['self', 'data:', ...IMAGE_HOSTS],
            'font-src': ['self', 'https://fonts.gstatic.com'],
            //? Musique des profils : le lecteur YouTube embarqué (voir src/lib/profile-music.ts).
            'frame-src': [YOUTUBE_EMBED_ORIGIN],
            'connect-src': ['self', 'https://insight.f95france.site'],
            'object-src': ['none'],
            'base-uri': ['self'],
            'form-action': ['self'],
            'frame-ancestors': ['none'],
            //? Vite's dev tooling spins up a blob: worker; not needed once built.
            ...(dev ? { 'worker-src': ['self', 'blob:'] } : {}),
          },
        },
      }),
      tailwindcss(),
      webSocketServer,
    ],
  };
});
