import { sveltekit } from '@sveltejs/kit/vite';
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

export default defineConfig({
  plugins: [sveltekit(), tailwindcss(), webSocketServer],
});
