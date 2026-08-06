import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import pino from 'pino';
import { WebSocketServer } from 'ws';

// Deliberately not $lib/server/logger or $env: this module is also imported by
// server.ts, which runs outside SvelteKit/Vite and can't resolve those aliases.
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const WS_PATH = '/ws';

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (socket) => {
  logger.info('ws client connected');

  socket.on('message', (data) => {
    socket.send(data.toString());
  });

  socket.on('close', () => {
    logger.info('ws client disconnected');
  });
});

export const handleUpgrade = (
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
) => {
  const { pathname } = new URL(request.url ?? '', 'http://localhost');

  if (pathname !== WS_PATH) return false;

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });

  return true;
};
