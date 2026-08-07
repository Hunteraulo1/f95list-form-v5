import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
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

        alias: {
          $features: './src/features',
        },

        csp: {
          mode: 'auto',
          directives: {
            'default-src': ['self'],
            'script-src': ['self', 'https://insight.f95france.site'],
            'style-src': ['self', 'https://fonts.googleapis.com'],
            'img-src': [
              'self',
              'data:',
              'https://cdn.f95france.site',
              'https://cdn.jsdelivr.net',
            ],
            'font-src': ['self', 'https://fonts.gstatic.com'],
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
