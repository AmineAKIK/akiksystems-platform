FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends libvips-tools \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app

FROM base AS build

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @akiksystems/core build \
  && pnpm --filter @akiksystems/db build \
  && pnpm --filter @akiksystems/web build \
  && pnpm --filter @akiksystems/web --prod deploy --legacy /prod/web

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --chown=node:node --from=build /prod/web /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
