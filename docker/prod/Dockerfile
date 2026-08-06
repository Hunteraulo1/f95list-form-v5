# ---------- Build ----------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run check
RUN bun run build

# ---------- Runtime ----------
FROM oven/bun:1-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/server.ts .
COPY --from=builder /app/src/lib/server/ws ./src/lib/server/ws
COPY --from=builder /app/package.json .
COPY --from=builder /app/bun.lock .

RUN bun install --production --frozen-lockfile

EXPOSE 3000

CMD ["bun", "run", "start"]
