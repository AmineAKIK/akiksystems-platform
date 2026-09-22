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
RUN pnpm --filter @akiksystems/core build
RUN pnpm --filter @akiksystems/db build
RUN pnpm --filter @akiksystems/web build

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node --from=build /app /app

USER node

EXPOSE 3000

CMD ["pnpm", "--filter", "@akiksystems/web", "start"]
