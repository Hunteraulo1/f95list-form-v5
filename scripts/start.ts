import { createServer } from 'node:http';

import { handler } from '../build/handler.js';
import { handleUpgrade } from '../src/lib/server/ws/socket.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = createServer((req, res) => {
  handler(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  if (!handleUpgrade(request, socket, head)) {
    socket.destroy();
  }
});

server.listen(port, host, () => {
  console.log(`Listening on ${host}:${port}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
