# syntax=docker/dockerfile:1

# Crawlm runs TypeScript directly through tsx (see package.json scripts), so we
# don't need a separate build stage — we ship the sources and run them.
# Node version tracks package.json engines (node >=20.14.0).
FROM node:20-slim

# Tini gives us correct PID 1 signal handling for the long-running crawler.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development
WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy the rest of the source tree.
COPY . .

EXPOSE 5000

ENTRYPOINT ["/usr/bin/tini", "--"]
# Default command is the API server; the crawler service overrides this with
# src/worker.ts. Both entrypoints live under src/ and are run through tsx.
CMD ["npx", "tsx", "src/server.ts"]
