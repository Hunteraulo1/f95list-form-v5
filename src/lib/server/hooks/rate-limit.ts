import { error, type Handle } from '@sveltejs/kit';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;

//? In-memory: resets on restart and isn't shared across instances. Move to Redis if the app scales horizontally.
const hits = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();

  for (const [ip, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(ip);
  }
}, WINDOW_MS).unref();

export const handleRateLimit: Handle = async ({ event, resolve }) => {
  const ip = event.getClientAddress();
  const now = Date.now();

  const entry = hits.get(ip);

  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;

    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      error(429, 'Too Many Requests');
    }
  }

  return resolve(event);
};
